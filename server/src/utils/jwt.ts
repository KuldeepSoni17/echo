import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  username: string;
  isVerified: boolean;
  isAdmin: boolean;
  type: 'access' | 'onboarding';
}

export function signToken(
  payload: Omit<TokenPayload, 'type'>,
  type: 'access' | 'onboarding' = 'access',
): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(
    { ...payload, type },
    process.env.JWT_SECRET,
    { expiresIn: type === 'onboarding' ? '1h' : '7d' },
  );
}

export function verifyToken(token: string): TokenPayload {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
}
