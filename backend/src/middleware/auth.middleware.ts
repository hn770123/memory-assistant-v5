import { Context, Next } from 'hono';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import type { Env, JWTPayload } from '../types';

// Extend Context to include user information
export interface AuthContext {
  user: JWTPayload;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to context
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AuthContext }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const jwtSecret = c.env.JWT_SECRET;
  const payload = verifyToken(token, jwtSecret);

  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  // Attach user info to context
  c.set('user', payload);

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't fail if missing
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const jwtSecret = c.env.JWT_SECRET;
    const payload = verifyToken(token, jwtSecret);

    if (payload) {
      c.set('user', payload);
    }
  }

  await next();
}
