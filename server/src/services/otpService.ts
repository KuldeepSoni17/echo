import { redis } from '../utils/redis';
import twilio from 'twilio';
import { randomInt } from 'crypto';
import { GoneError, TooManyRequestsError } from '../utils/errors';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

interface OTPData {
  code: string;
  attempts: number;
}

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 3;

function otpKey(phoneNumber: string): string {
  return `otp:${phoneNumber}`;
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  const code = String(randomInt(100000, 999999));
  const key = otpKey(phoneNumber);
  const data: OTPData = { code, attempts: 0 };

  await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(data));

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV OTP] ${phoneNumber}: ${code}`);
    return;
  }

  await client.messages.create({
    body: `Your Echo verification code is: ${code}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phoneNumber,
  });
}

export async function verifyOTP(phoneNumber: string, inputCode: string): Promise<boolean> {
  const key = otpKey(phoneNumber);
  const raw = await redis.get(key);

  if (!raw) {
    throw new GoneError('OTP expired or not found. Please request a new code.');
  }

  const { code, attempts }: OTPData = JSON.parse(raw) as OTPData;

  if (attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    throw new TooManyRequestsError('Too many failed attempts. Please request a new code.');
  }

  if (code !== inputCode) {
    const ttl = await redis.ttl(key);
    const remaining = Math.max(ttl, 1);
    await redis.setex(key, remaining, JSON.stringify({ code, attempts: attempts + 1 }));
    return false;
  }

  await redis.del(key);
  return true;
}

/**
 * Masks a phone number for display purposes.
 * Example: "+919876541234" -> "+91 ****1234"
 */
export function maskPhone(phoneNumber: string): string {
  if (phoneNumber.length < 5) return '****';

  // Extract the last 4 digits
  const last4 = phoneNumber.slice(-4);

  // Find country code prefix — everything before the subscriber number
  // We'll use a simple heuristic: keep "+" and the first few chars as country code
  const stripped = phoneNumber.replace(/\D/g, '');
  const subscriberLen = 10; // most country subscriber numbers are 10 digits

  let countryCode = '';
  if (phoneNumber.startsWith('+')) {
    const dialCodeLen = Math.max(stripped.length - subscriberLen, 1);
    countryCode = `+${stripped.slice(0, dialCodeLen)} `;
  }

  return `${countryCode}****${last4}`;
}
