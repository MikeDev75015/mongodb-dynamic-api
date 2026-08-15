import { DynamicApiModule } from '../../dynamic-api.module';
import { createHealthController } from './health.controller';
import { DynamicApiHealthModule } from './health.module';

jest.mock('../../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: jest.fn() } },
}));

jest.mock('./health.controller', () => ({
  createHealthController: jest.fn().mockReturnValue(class MockHealthController {}),
}));

const mockStateGet = DynamicApiModule.state.get as jest.Mock;
const mockCreateHealthController = createHealthController as jest.Mock;

describe('DynamicApiHealthModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
