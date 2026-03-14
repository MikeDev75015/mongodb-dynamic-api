/** Fixtures for auth-api-login and websockets-auth-login tests */

export const LOGIN_ADMIN = {
  username: 'admin',
  pass: 'admin',
  role: 'admin' as const,
  isVerified: true,
};

export const LOGIN_USER = {
  username: 'user',
  pass: 'user',
};

export const LOGIN_CLIENT = {
  username: 'client',
  pass: 'client',
  role: 'client' as const,
  isVerified: true,
};

