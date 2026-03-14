import {
  AUTH_CHANGE_PASSWORD_EVENT,
  AUTH_GET_ACCOUNT_BROADCAST_EVENT,
  AUTH_GET_ACCOUNT_EVENT,
  AUTH_LOGIN_BROADCAST_EVENT,
  AUTH_LOGIN_EVENT,
  AUTH_REGISTER_BROADCAST_EVENT,
  AUTH_REGISTER_EVENT,
  AUTH_RESET_PASSWORD_EVENT,
  AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT,
  AUTH_UPDATE_ACCOUNT_EVENT,
} from './auth-events.constants';

describe('auth-events constants', () => {
  it.each([
    ['AUTH_LOGIN_EVENT', AUTH_LOGIN_EVENT, 'auth-login'],
    ['AUTH_REGISTER_EVENT', AUTH_REGISTER_EVENT, 'auth-register'],
    ['AUTH_GET_ACCOUNT_EVENT', AUTH_GET_ACCOUNT_EVENT, 'auth-get-account'],
    ['AUTH_UPDATE_ACCOUNT_EVENT', AUTH_UPDATE_ACCOUNT_EVENT, 'auth-update-account'],
    ['AUTH_RESET_PASSWORD_EVENT', AUTH_RESET_PASSWORD_EVENT, 'auth-reset-password'],
    ['AUTH_CHANGE_PASSWORD_EVENT', AUTH_CHANGE_PASSWORD_EVENT, 'auth-change-password'],
    ['AUTH_LOGIN_BROADCAST_EVENT', AUTH_LOGIN_BROADCAST_EVENT, 'auth-login-broadcast'],
    ['AUTH_REGISTER_BROADCAST_EVENT', AUTH_REGISTER_BROADCAST_EVENT, 'auth-register-broadcast'],
    ['AUTH_GET_ACCOUNT_BROADCAST_EVENT', AUTH_GET_ACCOUNT_BROADCAST_EVENT, 'auth-get-account-broadcast'],
    ['AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT', AUTH_UPDATE_ACCOUNT_BROADCAST_EVENT, 'auth-update-account-broadcast'],
  ])('%s should equal "%s"', (_, constant, expected) => {
    expect(constant).toBe(expected);
  });
});

