import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryPresenceAdapter } from './in-memory-presence.adapter';

describe('InMemoryPresenceAdapter', () => {
  let adapter: InMemoryPresenceAdapter;

  beforeEach(() => {
    adapter = new InMemoryPresenceAdapter();
  });

  describe('setOnline', () => {
    it('should mark a user as online', async () => {
      await adapter.setOnline('u1', 'sock-1');
      expect(await adapter.isOnline('u1')).toBe(true);
    });

    it('should track multiple sockets for the same user (multi-tab)', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u1', 'sock-2');
      expect(await adapter.getSocketCount('u1')).toBe(2);
    });

    it('should store the room when provided', async () => {
      await adapter.setOnline('u1', 'sock-1', 'room-A');
      const ids = await adapter.getOnlineUserIds('room-A');
      expect(ids).toContain('u1');
    });

    it('should not double-count the same socketId', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u1', 'sock-1');
      expect(await adapter.getSocketCount('u1')).toBe(1);
    });
  });

  describe('setOffline', () => {
    it('should remove one socket but keep user online when other sockets remain', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u1', 'sock-2');
      await adapter.setOffline('u1', 'sock-1');
      expect(await adapter.isOnline('u1')).toBe(true);
      expect(await adapter.getSocketCount('u1')).toBe(1);
    });

    it('should mark user as offline when last socket disconnects', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOffline('u1', 'sock-1');
      expect(await adapter.isOnline('u1')).toBe(false);
    });

    it('should remove room mapping for the socket', async () => {
      await adapter.setOnline('u1', 'sock-1', 'room-A');
      await adapter.setOffline('u1', 'sock-1');
      expect(await adapter.getOnlineUserIds('room-A')).not.toContain('u1');
    });

    it('should be a no-op when user was never online', async () => {
      await expect(adapter.setOffline('unknown', 'sock-x')).resolves.toBeUndefined();
    });

    it('should be a no-op for unknown socketId of known user', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOffline('u1', 'sock-unknown');
      expect(await adapter.isOnline('u1')).toBe(true);
    });
  });

  describe('isOnline', () => {
    it('should return false for unknown user', async () => {
      expect(await adapter.isOnline('ghost')).toBe(false);
    });

    it('should return true after setOnline', async () => {
      await adapter.setOnline('u1', 'sock-1');
      expect(await adapter.isOnline('u1')).toBe(true);
    });

    it('should return false after all sockets disconnect', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOffline('u1', 'sock-1');
      expect(await adapter.isOnline('u1')).toBe(false);
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return all online user IDs when no room filter', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u2', 'sock-2');
      const ids = await adapter.getOnlineUserIds();
      expect(ids).toEqual(expect.arrayContaining(['u1', 'u2']));
      expect(ids).toHaveLength(2);
    });

    it('should return empty array when nobody is online', async () => {
      expect(await adapter.getOnlineUserIds()).toEqual([]);
    });

    it('should filter by room', async () => {
      await adapter.setOnline('u1', 'sock-1', 'room-A');
      await adapter.setOnline('u2', 'sock-2', 'room-B');
      expect(await adapter.getOnlineUserIds('room-A')).toEqual(['u1']);
      expect(await adapter.getOnlineUserIds('room-B')).toEqual(['u2']);
    });

    it('should return empty array for unknown room', async () => {
      await adapter.setOnline('u1', 'sock-1', 'room-A');
      expect(await adapter.getOnlineUserIds('room-X')).toEqual([]);
    });

    it('should not duplicate user when they have multiple sockets in same room', async () => {
      await adapter.setOnline('u1', 'sock-1', 'room-A');
      await adapter.setOnline('u1', 'sock-2', 'room-A');
      const ids = await adapter.getOnlineUserIds('room-A');
      expect(ids).toEqual(['u1']);
    });
  });

  describe('getSocketCount', () => {
    it('should return 0 for unknown user', async () => {
      expect(await adapter.getSocketCount('ghost')).toBe(0);
    });

    it('should return correct count for multi-tab user', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u1', 'sock-2');
      await adapter.setOnline('u1', 'sock-3');
      expect(await adapter.getSocketCount('u1')).toBe(3);
    });

    it('should decrease after one socket disconnects', async () => {
      await adapter.setOnline('u1', 'sock-1');
      await adapter.setOnline('u1', 'sock-2');
      await adapter.setOffline('u1', 'sock-1');
      expect(await adapter.getSocketCount('u1')).toBe(1);
    });
  });
});

