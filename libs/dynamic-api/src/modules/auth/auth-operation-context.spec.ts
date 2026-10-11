import { describe, expect, it } from 'vitest';
import { AuthOperationContext, authOperationStorage, getAuthOperationContext } from './auth-operation-context';

describe('auth-operation-context', () => {
  describe('getAuthOperationContext', () => {
    it('should return undefined outside of any storage run', () => {
      expect(getAuthOperationContext()).toBeUndefined();
    });

    it.each<AuthOperationContext>(['login', 'register', 'updateAccount'])(
      'should return "%s" inside authOperationStorage.run("%s", ...)',
      async (operation) => {
        let capturedContext: AuthOperationContext | undefined;

        await authOperationStorage.run(operation, async () => {
          capturedContext = getAuthOperationContext();
        });

        expect(capturedContext).toBe(operation);
      },
    );

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

