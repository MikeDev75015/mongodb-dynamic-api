import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, MockedClass } from 'vitest';
import Redis from 'ioredis';
import { DEFAULT_REDIS_PRESENCE_TTL, RedisPresenceAdapter } from './redis-presence.adapter';

vi.mock('ioredis', () => {
  const mockInstance = {
    sadd: vi.fn(),
    srem: vi.fn(),
    scard: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
    smembers: vi.fn(),
    eval: vi.fn(),
    quit: vi.fn(),
  };
  const ctor = vi.fn(() => mockInstance);
  (ctor as unknown as Record<string, unknown>).__instance = mockInstance;
  return { __esModule: true, default: ctor };
});

/**
 * Creates a plain object that satisfies the shape of an ioredis Redis client.
 * No real Redis connection is made — all commands are vi.fn() stubs.
 */
const createRedisMock = () => ({
  sadd: vi.fn(),
  srem: vi.fn(),
  scard: vi.fn(),
  expire: vi.fn(),
  keys: vi.fn(),
  smembers: vi.fn(),
  eval: vi.fn(),
  quit: vi.fn(),
});

type RedisMock = ReturnType<typeof createRedisMock>;

describe('RedisPresenceAdapter', () => {
  let adapter: RedisPresenceAdapter;
  let redisMock: RedisMock;

  beforeEach(() => {
    vi.clearAllMocks();
    redisMock = createRedisMock();
    // Inject the mock Redis client directly via the overloaded constructor
    adapter = new RedisPresenceAdapter(redisMock as never);
  });

  it('should use DEFAULT_REDIS_PRESENCE_TTL = 60', () => {
    expect(DEFAULT_REDIS_PRESENCE_TTL).toBe(60);
  });

  describe('constructor with string URL', () => {
    it('should instantiate ioredis Redis with the provided URL and lazyConnect option', () => {
      const MockRedis = Redis as MockedClass<typeof Redis>;
      MockRedis.mockClear();

      new RedisPresenceAdapter('redis://localhost:6379');

      expect(MockRedis).toHaveBeenCalledWith('redis://localhost:6379', { lazyConnect: true });
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit the Redis connection', async () => {
      redisMock.quit.mockResolvedValue('OK');
      await adapter.onModuleDestroy();
      expect(redisMock.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('setOnline', () => {
    it('should SADD socketId and EXPIRE the sockets key', async () => {
      redisMock.sadd.mockResolvedValue(1);
      redisMock.expire.mockResolvedValue(1);

      await adapter.setOnline('u1', 'sock-1');

      expect(redisMock.sadd).toHaveBeenCalledWith('presence:sockets:u1', 'sock-1');
      expect(redisMock.expire).toHaveBeenCalledWith('presence:sockets:u1', DEFAULT_REDIS_PRESENCE_TTL);
    });

    it('should SADD userId to room key and EXPIRE it when room is provided', async () => {
      redisMock.sadd.mockResolvedValue(1);
      redisMock.expire.mockResolvedValue(1);

      await adapter.setOnline('u1', 'sock-1', 'room-A');

      expect(redisMock.sadd).toHaveBeenCalledWith('presence:room:room-A', 'u1');
      expect(redisMock.expire).toHaveBeenCalledWith('presence:room:room-A', DEFAULT_REDIS_PRESENCE_TTL);
    });

    it('should not touch room key when no room is provided', async () => {
      redisMock.sadd.mockResolvedValue(1);
      redisMock.expire.mockResolvedValue(1);

      await adapter.setOnline('u1', 'sock-1');

      const saddCalls = (redisMock.sadd as Mock).mock.calls as [string, ...unknown[]][];
      expect(saddCalls.every((args) => !String(args[0]).startsWith('presence:room:'))).toBe(true);
    });

    it('should use custom TTL when adapter is created with non-default ttl', async () => {
      const customRedisMock = createRedisMock();
      const customAdapter = new RedisPresenceAdapter(customRedisMock as never, 120);
      customRedisMock.sadd.mockResolvedValue(1);
      customRedisMock.expire.mockResolvedValue(1);

      await customAdapter.setOnline('u1', 'sock-1');

      expect(customRedisMock.expire).toHaveBeenCalledWith('presence:sockets:u1', 120);
    });
  });

  describe('setOffline', () => {
    it('should call eval with Lua script, sockets key and socketId', async () => {
      redisMock.eval.mockResolvedValue(1);
      redisMock.scard.mockResolvedValue(1);

      await adapter.setOffline('u1', 'sock-1');

      expect(redisMock.eval).toHaveBeenCalled();
      const evalArgs = (redisMock.eval as Mock).mock.calls[0] as [
        string,
        number,
        string,
        string,
      ];
      expect(evalArgs[2]).toBe('presence:sockets:u1');
      expect(evalArgs[3]).toBe('sock-1');
    });

    it('should scan and SREM user from all room keys when no sockets remain', async () => {
      redisMock.eval.mockResolvedValue(1);
      redisMock.scard.mockResolvedValue(0);
      redisMock.keys.mockResolvedValue(['presence:room:room-A', 'presence:room:room-B']);
      redisMock.srem.mockResolvedValue(1);

      await adapter.setOffline('u1', 'sock-1');

      expect(redisMock.keys).toHaveBeenCalledWith('presence:room:*');
      expect(redisMock.srem).toHaveBeenCalledWith('presence:room:room-A', 'u1');
      expect(redisMock.srem).toHaveBeenCalledWith('presence:room:room-B', 'u1');
    });

    it('should NOT scan room keys when user still has active sockets', async () => {
      redisMock.eval.mockResolvedValue(1);
      redisMock.scard.mockResolvedValue(2);

      await adapter.setOffline('u1', 'sock-1');

      expect(redisMock.keys).not.toHaveBeenCalled();
    });

    it('should NOT call srem when no room keys exist', async () => {
      redisMock.eval.mockResolvedValue(1);
      redisMock.scard.mockResolvedValue(0);
      redisMock.keys.mockResolvedValue([]);

      await adapter.setOffline('u1', 'sock-1');

      expect(redisMock.srem).not.toHaveBeenCalled();
    });
  });

  describe('isOnline', () => {
    it.each([
      [1, true],
      [3, true],
      [0, false],
    ])('scard=%s → isOnline=%s', async (count, expected) => {
      redisMock.scard.mockResolvedValue(count);
      expect(await adapter.isOnline('u1')).toBe(expected);
      expect(redisMock.scard).toHaveBeenCalledWith('presence:sockets:u1');
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return all user IDs stripped from sockets keys when no room filter', async () => {
      redisMock.keys.mockResolvedValue([
        'presence:sockets:u1',
        'presence:sockets:u2',
      ]);

      const ids = await adapter.getOnlineUserIds();

      expect(ids).toEqual(['u1', 'u2']);
    });

    it('should return empty array when no sockets keys exist', async () => {
      redisMock.keys.mockResolvedValue([]);
      expect(await adapter.getOnlineUserIds()).toEqual([]);
    });

    it('should return smembers of the room set when room is provided', async () => {
      redisMock.smembers.mockResolvedValue(['u1', 'u3']);

      const ids = await adapter.getOnlineUserIds('room-A');

      expect(redisMock.smembers).toHaveBeenCalledWith('presence:room:room-A');
      expect(ids).toEqual(['u1', 'u3']);
    });
  });

  describe('getSocketCount', () => {
    it.each([
      [0, 0],
      [2, 2],
      [5, 5],
    ])('scard=%s → count=%s', async (cardValue, expected) => {
      redisMock.scard.mockResolvedValue(cardValue);
      expect(await adapter.getSocketCount('u1')).toBe(expected);
      expect(redisMock.scard).toHaveBeenCalledWith('presence:sockets:u1');
    });
  });
});




