import { Hono } from 'hono';
import { createDbClient } from '../db/client';
import { registerUser, loginUser, getUserById } from '../services/auth.service';
import { authMiddleware, type AuthContext } from '../middleware/auth.middleware';
import type { Env, UserCreateInput, UserLoginInput } from '../types';

const auth = new Hono<{ Bindings: Env; Variables: AuthContext }>();

/**
 * POST /api/auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<UserCreateInput>();

    // Validate input
    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password length
    if (body.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const db = createDbClient(c.env.DB);
    const result = await registerUser(db, body, c.env.JWT_SECRET);

    return c.json(result, 201);
  } catch (error) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message.includes('already exists')) {
      return c.json({ error: message }, 409);
    }

    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<UserLoginInput>();

    // Validate input
    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = createDbClient(c.env.DB);
    const result = await loginUser(db, body, c.env.JWT_SECRET);

    return c.json(result);
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';

    if (message.includes('Invalid email or password')) {
      return c.json({ error: message }, 401);
    }

    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const db = createDbClient(c.env.DB);

    const currentUser = await getUserById(db, user.userId);

    if (!currentUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: currentUser });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user info' }, 500);
  }
});

export default auth;
