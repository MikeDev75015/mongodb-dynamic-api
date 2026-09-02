import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DynamicApiModule } from '../../dynamic-api.module';
import { InMemoryPresenceAdapter } from './adapters/in-memory-presence.adapter';
import { RedisPresenceAdapter } from './adapters/redis-presence.adapter';
import { createPresenceGateway } from './presence.gateway';
import { DynamicApiPresenceModule } from './presence.module';

vi.mock('../../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: vi.fn() } },
}));

vi.mock('./adapters/redis-presence.adapter', () => ({
  RedisPresenceAdapter: vi.fn().mockImplementation(() => ({ type: 'redis' })),
}));

vi.mock('./adapters/in-memory-presence.adapter', () => ({
  InMemoryPresenceAdapter: vi.fn().mockImplementation(() => ({ type: 'memory' })),
}));

vi.mock('./presence.gateway', () => ({
  createPresenceGateway: vi.fn().mockReturnValue(
    class MockPresenceGateway {},
  ),
}));

const mockStateGet = DynamicApiModule.state.get as Mock;

describe('DynamicApiPresenceModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateGet.mockReturnValue(undefined);
  });

  describe('register', () => {
    describe('adapter: memory', () => {
      it('should create module with InMemoryPresenceAdapter', () => {
        const result = DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(InMemoryPresenceAdapter).toHaveBeenCalledTimes(1);
        expect(RedisPresenceAdapter).not.toHaveBeenCalled();
        expect(result.module).toBe(DynamicApiPresenceModule);
      });

      it('should NOT include PresenceController when enableController is false (default)', () => {
        const result = DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(result.controllers).toEqual([]);
      });

      it('should include PresenceController when enableController is true', () => {
        const result = DynamicApiPresenceModule.register({
          adapter: 'memory',
          enableController: true,
        });

        expect(result.controllers).toHaveLength(1);
      });

      it('should export DYNAMIC_API_PRESENCE_ADAPTER token', () => {
        const result = DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(result.exports).toHaveLength(1);
        expect(typeof result.exports![0]).toBe('symbol');
      });
    });

    describe('adapter: redis', () => {
      it('should create module with RedisPresenceAdapter using provided URL', () => {
        DynamicApiPresenceModule.register({
          adapter: 'redis',
          redisUrl: 'redis://localhost:6379',
        });

        expect(RedisPresenceAdapter).toHaveBeenCalledWith('redis://localhost:6379', undefined);
      });

      it('should pass custom TTL to RedisPresenceAdapter', () => {
        DynamicApiPresenceModule.register({
          adapter: 'redis',
          redisUrl: 'redis://localhost:6379',
          redisTtlSeconds: 120,
        });

        expect(RedisPresenceAdapter).toHaveBeenCalledWith('redis://localhost:6379', 120);
      });

      it('should throw when redisUrl is missing', () => {
        expect(() =>
          DynamicApiPresenceModule.register({ adapter: 'redis' }),
        ).toThrow('`redisUrl` is required');
      });
    });

    describe('gateway options', () => {
      it('should use gatewayOptions from DynamicApiModule state', () => {
        const gatewayOpts = { namespace: '/test' };
        mockStateGet.mockImplementation((key: string) => {
          if (key === 'gatewayOptions') return gatewayOpts;
          return undefined;
        });

        DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(createPresenceGateway).toHaveBeenCalledWith(gatewayOpts);
      });

      it('should fall back to broadcastGatewayOptions when gatewayOptions is absent', () => {
        const broadcastOpts = { namespace: '/broadcast' };
        mockStateGet.mockImplementation((key: string) => {
          if (key === 'broadcastGatewayOptions') return broadcastOpts;
          return undefined;
        });

        DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(createPresenceGateway).toHaveBeenCalledWith(broadcastOpts);
      });

      it('should fall back to empty object when no gateway options exist', () => {
        mockStateGet.mockReturnValue(undefined);

        DynamicApiPresenceModule.register({ adapter: 'memory' });

        expect(createPresenceGateway).toHaveBeenCalledWith({});
      });
    });
  });
});


