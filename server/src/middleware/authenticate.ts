import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        isVerified: boolean;
        isBanned: boolean;
        isAdmin: boolean;
      };
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export function authenticateJWT(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = {
      id: payload.userId,
      username: payload.username,
      isVerified: payload.isVerified,
      isBanned: false, // will be overridden below if banned
      isAdmin: payload.isAdmin,
    };

    // isBanned is not stored in JWT payload to avoid stale reads on short-lived tokens.
    // For production, consider checking Redis or DB here.
    // We check it lazily in routes that need it.

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireOnboardingToken(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const payload = verifyToken(token);

    if (payload.type !== 'onboarding') {
      throw new UnauthorizedError('Onboarding token required');
    }

    req.user = {
      id: payload.userId,
      username: payload.username,
      isVerified: payload.isVerified,
      isBanned: false,
      isAdmin: payload.isAdmin,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.type === 'access') {
      req.user = {
        id: payload.userId,
        username: payload.username,
        isVerified: payload.isVerified,
        isBanned: false,
        isAdmin: payload.isAdmin,
      };
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
}

export function requireNotBanned(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.isBanned) {
    throw new ForbiddenError('Your account has been banned');
  }
  next();
}
