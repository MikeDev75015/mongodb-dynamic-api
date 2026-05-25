import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PresenceAdapter } from '../../../interfaces';

/** Default TTL in seconds applied to every Redis presence key. */
export const DEFAULT_REDIS_PRESENCE_TTL = 60;

/**
 * Lua script for atomic SREM + DEL-if-empty on a Redis set.
 *
 * Using a Lua script keeps the read-then-delete sequence atomic (no race
 * between two concurrent disconnect events on different instances).
 */
const LUA_SREM_DEL_IF_EMPTY = `
local removed = redis.call('SREM', KEYS[1], ARGV[1])
if redis.call('SCARD', KEYS[1]) == 0 then
  redis.call('DEL', KEYS[1])
end
return removed
`;

/**
 * Redis-backed implementation of `PresenceAdapter` using ioredis.
 *
 * Key schema:
 *  - `presence:sockets:{userId}` — Redis SET of active socketIds for a user.
 *  - `presence:room:{roomId}`    — Redis SET of online userIds for a room.
 *
 * Every key is given a TTL (configurable, default 60 s) that is refreshed on
 * every `setOnline` call. This acts as a safety-net heartbeat: stale entries
 * from crashed processes expire automatically.
 *
 * `setOffline` uses an atomic Lua script to SREM + DEL-if-empty, avoiding
 * race conditions in multi-instance deployments.
 */
@Injectable()
export class RedisPresenceAdapter implements PresenceAdapter, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly ttl: number;

  /**
   * @param redisUrlOrClient - Redis connection URL or an existing `ioredis.Redis` instance.
   *   Accepting an instance makes the adapter easy to test without a real Redis server.
   * @param ttlSeconds - TTL applied to presence keys (default: 60 s).
   */
  constructor(
    redisUrlOrClient: string | Redis,
    ttlSeconds: number = DEFAULT_REDIS_PRESENCE_TTL,
  ) {
    this.redis =
      typeof redisUrlOrClient === 'string'
        ? new Redis(redisUrlOrClient, { lazyConnect: true })
        : redisUrlOrClient;
    this.ttl = ttlSeconds;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // ---------------------------------------------------------------------------
  // Key builders
  // ---------------------------------------------------------------------------

  private socketsKey(userId: string): string {
    return `presence:sockets:${userId}`;
  }

  private roomKey(roomId: string): string {
    return `presence:room:${roomId}`;
  }

  // ---------------------------------------------------------------------------
  // PresenceAdapter implementation
  // ---------------------------------------------------------------------------

  async setOnline(userId: string, socketId: string, room?: string): Promise<void> {
    const sockKey = this.socketsKey(userId);
    await this.redis.sadd(sockKey, socketId);
    await this.redis.expire(sockKey, this.ttl);

    if (room) {
      const rKey = this.roomKey(room);
      await this.redis.sadd(rKey, userId);
      await this.redis.expire(rKey, this.ttl);
    }
  }

  async setOffline(userId: string, socketId: string): Promise<void> {
    await this.redis.eval(LUA_SREM_DEL_IF_EMPTY, 1, this.socketsKey(userId), socketId);

    /** Only clean up room memberships once the user has no sockets left. */
    const remaining = await this.redis.scard(this.socketsKey(userId));

    if (remaining === 0) {
      const roomKeys = await this.redis.keys('presence:room:*');
      if (roomKeys.length > 0) {
        await Promise.all(roomKeys.map((k) => this.redis.srem(k, userId)));
      }
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    const count = await this.redis.scard(this.socketsKey(userId));
    return count > 0;
  }

  async getOnlineUserIds(room?: string): Promise<string[]> {
    if (!room) {
      const keys = await this.redis.keys('presence:sockets:*');
      return keys.map((k) => k.replace('presence:sockets:', ''));
    }

    return this.redis.smembers(this.roomKey(room));
  }

  async getSocketCount(userId: string): Promise<number> {
    return this.redis.scard(this.socketsKey(userId));
  }
}


