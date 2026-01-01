import { apiClient } from './api';
import type { RegisterInput, LoginInput, AuthResponse, User } from '../types';

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', input);

  // Store token in localStorage
  localStorage.setItem('auth_token', response.token);

  return response;
}

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', input);

  // Store token in localStorage
  localStorage.setItem('auth_token', response.token);

  return response;
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.removeItem('auth_token');
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ user: User }>('/api/auth/me');
  return response.user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}
