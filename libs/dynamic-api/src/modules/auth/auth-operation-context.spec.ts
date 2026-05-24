import { AuthOperationContext, authOperationStorage, getAuthOperationContext } from './auth-operation-context';

describe('auth-operation-context', () => {
  describe('getAuthOperationContext', () => {
    it('should return undefined outside of any storage run', () => {
      expect(getAuthOperationContext()).toBeUndefined();
    });

    it('should return "login" inside authOperationStorage.run("login", ...)', async () => {
      let capturedContext: AuthOperationContext | undefined;

      await authOperationStorage.run('login', async () => {
        capturedContext = getAuthOperationContext();
      });

      expect(capturedContext).toBe('login');
    });

    it('should return "register" inside authOperationStorage.run("register", ...)', async () => {
      let capturedContext: AuthOperationContext | undefined;

      await authOperationStorage.run('register', async () => {
        capturedContext = getAuthOperationContext();
      });

      expect(capturedContext).toBe('register');
    });

    it('should return "updateAccount" inside authOperationStorage.run("updateAccount", ...)', async () => {
      let capturedContext: AuthOperationContext | undefined;

      await authOperationStorage.run('updateAccount', async () => {
        capturedContext = getAuthOperationContext();
      });

      expect(capturedContext).toBe('updateAccount');
    });

    it('should return undefined again after storage run completes', async () => {
      await authOperationStorage.run('login', async () => {
        // inside run
      });

      expect(getAuthOperationContext()).toBeUndefined();
    });

    it('should isolate contexts between concurrent async runs', async () => {
      const results: (AuthOperationContext | undefined)[] = [];

      const run1 = authOperationStorage.run('login', async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        results.push(getAuthOperationContext());
      });

      const run2 = authOperationStorage.run('register', async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        results.push(getAuthOperationContext());
      });

      await Promise.all([run1, run2]);

      expect(results).toContain('login');
      expect(results).toContain('register');
      expect(results).toHaveLength(2);
    });
  });
});

