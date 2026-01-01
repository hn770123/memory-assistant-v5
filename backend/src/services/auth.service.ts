import { eq } from 'drizzle-orm';
import type { DbClient } from '../db/client';
import { users } from '../db/schema';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import type { UserCreateInput, UserLoginInput, AuthResponse, User } from '../types';

/**
 * Register a new user
 */
export async function registerUser(
  db: DbClient,
  input: UserCreateInput,
  jwtSecret: string
): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const result = await db
    .insert(users)
    .values({
      email: input.email,
      password_hash: passwordHash,
      display_name: input.display_name || null,
    })
    .returning({
      id: users.id,
      email: users.email,
      display_name: users.display_name,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .get();

  if (!result) {
    throw new Error('Failed to create user');
  }

  const user: User = {
    id: result.id,
    email: result.email,
    display_name: result.display_name,
    created_at: result.created_at || new Date().toISOString(),
    updated_at: result.updated_at || new Date().toISOString(),
  };

  // Generate JWT token
  const token = generateToken(
    {
      userId: user.id,
      email: user.email,
    },
    jwtSecret
  );

  return {
    user,
    token,
  };
}

/**
 * Login user
 */
export async function loginUser(
  db: DbClient,
  input: UserLoginInput,
  jwtSecret: string
): Promise<AuthResponse> {
  // Find user by email
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (!existingUser) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(
    input.password,
    existingUser.password_hash
  );

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const user: User = {
    id: existingUser.id,
    email: existingUser.email,
    display_name: existingUser.display_name,
    created_at: existingUser.created_at || new Date().toISOString(),
    updated_at: existingUser.updated_at || new Date().toISOString(),
  };

  // Generate JWT token
  const token = generateToken(
    {
      userId: user.id,
      email: user.email,
    },
    jwtSecret
  );

  return {
    user,
    token,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(db: DbClient, userId: number): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    email: result.email,
    display_name: result.display_name,
    created_at: result.created_at || new Date().toISOString(),
    updated_at: result.updated_at || new Date().toISOString(),
  };
}
