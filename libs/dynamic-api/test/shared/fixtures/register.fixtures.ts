/** Fixtures for auth-api-register and websockets-auth-register tests */

export const REGISTER_ADMIN = {
  email: 'admin@test.co',
  password: 'admin',
  role: 'admin' as const,
  isVerified: true,
};

export const REGISTER_USER = {
  email: 'user@test.co',
  password: 'user',
};

