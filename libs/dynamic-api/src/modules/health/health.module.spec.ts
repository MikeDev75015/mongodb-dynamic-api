import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicApiModule } from '../../dynamic-api.module';
import { createHealthController } from './health.controller';
import { DynamicApiHealthModule } from './health.module';

vi.mock('../../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: vi.fn() } },
}));

vi.mock('./health.controller', () => ({
  createHealthController: vi.fn().mockReturnValue(class MockHealthController {}),
}));

const mockStateGet = DynamicApiModule.state.get as Mock;
const mockCreateHealthController = createHealthController as Mock;

describe('DynamicApiHealthModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateGet.mockReturnValue('dynamic-api-connection');
  });

  describe('register', () => {
    it('should build the health controller from the connection name and the default path', () => {
      const result = DynamicApiHealthModule.register();

      expect(mockCreateHealthController).toHaveBeenCalledWith('dynamic-api-connection', 'health');
      expect(result.module).toBe(DynamicApiHealthModule);
      expect(result.controllers).toHaveLength(1);
    });

    it('should use the custom path when provided', () => {
      DynamicApiHealthModule.register({ path: 'healthz' });

      expect(mockCreateHealthController).toHaveBeenCalledWith('dynamic-api-connection', 'healthz');
    });
  });
});
