import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The context of the current auth operation.
 * Populated automatically before each auth service call.
 * Useful in custom class-validator decorators to apply operation-specific rules.
 *
 * @example
 * import { getAuthOperationContext } from '@dynamic-api';
 *
 * export function IsRequiredOnRegister(): PropertyDecorator {
 *   return ValidateIf(() => getAuthOperationContext() === 'register');
 * }
 */
type AuthOperationContext = 'register' | 'login' | 'updateAccount';

const authOperationStorage = new AsyncLocalStorage<AuthOperationContext>();

/**
 * Returns the current auth operation context if called within an auth request pipeline,
 * or `undefined` outside of it.
 */
const getAuthOperationContext = (): AuthOperationContext | undefined =>
  authOperationStorage.getStore();

export { AuthOperationContext, authOperationStorage, getAuthOperationContext };

