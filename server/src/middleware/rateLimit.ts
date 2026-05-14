import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis';
import { Request } from 'express';

function makeStore(prefix: string) {
  return new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as any,
    prefix: `rl:${prefix}:`,
  });
}

function userOrIpKey(req: Request): string {
  return req.user?.id ?? (req.ip || 'unknown');
}

// General rate limit — 200 req/min per user/IP
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('general'),
  message: { success: false, error: 'Too many requests, please slow down.' },
});

// OTP send — 3 per phone per 10 min (key by phone in request body)
export const otpSendLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = (req.body as { phoneNumber?: string })?.phoneNumber;
    return phone ? `phone:${phone}` : req.ip ?? 'unknown';
  },
  store: makeStore('otp-send'),
  message: { success: false, error: 'Too many OTP requests. Please wait 10 minutes.' },
  skipSuccessfulRequests: false,
});

// OTP by IP — 10 per IP per hour
export const otpIpLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('otp-ip'),
  message: { success: false, error: 'Too many OTP requests from this IP.' },
});

// Post create — 10 per user per day
export const postCreateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('post-create'),
  message: { success: false, error: 'Daily post limit reached. Come back tomorrow!' },
});

// Audio upload — 20 per user per day
export const audioUploadLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('audio-upload'),
  message: { success: false, error: 'Daily audio upload limit reached.' },
});

// Comment — 100 per user per day
export const commentLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('comment'),
  message: { success: false, error: 'Comment limit reached for today.' },
});

// Reaction — 500 per user per hour
export const reactionLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('reaction'),
  message: { success: false, error: 'Reaction limit reached.' },
});

// Report — 5 per user per hour
export const reportLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('report'),
  message: { success: false, error: 'Report limit reached.' },
});

// Search — 60 per user per minute
export const searchLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  store: makeStore('search'),
  message: { success: false, error: 'Search rate limit reached.' },
});
