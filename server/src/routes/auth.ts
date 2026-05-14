import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { prisma } from '../utils/prisma';
import { sendOTP, verifyOTP, maskPhone } from '../services/otpService';
import { signToken } from '../utils/jwt';
import { validate } from '../middleware/validate';
import { authenticateJWT, requireOnboardingToken } from '../middleware/authenticate';
import { otpSendLimit, otpIpLimit } from '../middleware/rateLimit';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/errors';
import { success } from '../utils/response';

export const authRoutes = Router();

const AVATAR_COLORS = [
  '#7C5CFF', '#FF5C8A', '#4FC3F7', '#FF8C42', '#FFD93D',
  '#E91E8C', '#78909C', '#69F0AE', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#96CEB4',
];

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;
}

// POST /api/auth/send-otp
const sendOtpSchema = z.object({
  phoneNumber: z.string().min(7).max(20),
});

authRoutes.post(
  '/send-otp',
  otpIpLimit,
  otpSendLimit,
  validate(sendOtpSchema),
  async (req: Request, res: Response) => {
    const { phoneNumber } = req.body as z.infer<typeof sendOtpSchema>;

    // Validate phone number
    if (!isValidPhoneNumber(phoneNumber)) {
      throw new ValidationError('Invalid phone number format. Please include country code (e.g. +1...)');
    }

    const parsed = parsePhoneNumber(phoneNumber);
    const normalized = parsed.format('E.164');

    // Check if user is banned
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: normalized },
      select: { isBanned: true },
    });

    if (existingUser?.isBanned) {
      throw new ValidationError('This account has been suspended');
    }

    await sendOTP(normalized);

    res.json(
      success({
        maskedPhone: maskPhone(normalized),
        message: 'OTP sent successfully',
      }),
    );
  },
);

// POST /api/auth/verify-otp
const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(7).max(20),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

authRoutes.post('/verify-otp', validate(verifyOtpSchema), async (req: Request, res: Response) => {
  const { phoneNumber, code } = req.body as z.infer<typeof verifyOtpSchema>;

  if (!isValidPhoneNumber(phoneNumber)) {
    throw new ValidationError('Invalid phone number');
  }

  const parsed = parsePhoneNumber(phoneNumber);
  const normalized = parsed.format('E.164');

  const isValid = await verifyOTP(normalized, code);
  if (!isValid) {
    throw new UnauthorizedError('Invalid verification code');
  }

  // Look up or create user
  let user = await prisma.user.findUnique({
    where: { phoneNumber: normalized },
  });

  const isAdmin = (process.env.ADMIN_PHONE_NUMBERS || '').split(',').includes(normalized);

  if (!user) {
    // New user — issue onboarding token so they can complete profile
    const tempUser = await prisma.user.create({
      data: {
        phoneNumber: normalized,
        username: `user_${Date.now()}`, // temp username, replaced during onboarding
        displayName: 'New User',
        avatarColor: randomAvatarColor(),
        isAdmin,
      },
    });

    const onboardingToken = signToken(
      {
        userId: tempUser.id,
        username: tempUser.username,
        isVerified: false,
        isAdmin: tempUser.isAdmin,
      },
      'onboarding',
    );

    res.json(
      success({
        isNewUser: true,
        onboardingToken,
      }),
    );
    return;
  }

  // Existing user — issue full access token
  if (isAdmin && !user.isAdmin) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
  });

  res.json(
    success({
      isNewUser: false,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        streakCount: user.streakCount,
      },
    }),
  );
});

// POST /api/auth/complete-profile
const completeProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(1).max(50).trim(),
});

authRoutes.post(
  '/complete-profile',
  requireOnboardingToken,
  validate(completeProfileSchema),
  async (req: Request, res: Response) => {
    const { username, displayName } = req.body as z.infer<typeof completeProfileSchema>;
    const userId = req.user!.id;

    // Check username availability (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (existing) {
      throw new ConflictError('Username is already taken');
    }

    const avatarColor = randomAvatarColor();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        displayName,
        avatarColor,
        isVerified: true,
      },
    });

    const token = signToken({
      userId: user.id,
      username: user.username,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
    });

    res.json(
      success({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          streakCount: user.streakCount,
        },
      }),
    );
  },
);

// GET /api/auth/me — validate token and return current user
authRoutes.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarColor: true,
      isVerified: true,
      isAdmin: true,
      streakCount: true,
      lastPostedAt: true,
      createdAt: true,
    },
  });

  res.json(success(user));
});
