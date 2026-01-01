import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types';

/**
 * Generate a JWT token
 * @param payload - JWT payload
 * @param secret - JWT secret key
 * @param expiresIn - Token expiration time (default: 24h)
 * @returns JWT token
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string | number = '24h'
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token
 * @param secret - JWT secret key
 * @returns Decoded JWT payload or null if invalid
 */
export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
