import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { BcryptService } from '../services/bcrypt/bcrypt.service';
import {
  DEFAULT_MAX_REFRESH_SESSIONS,
  findRefreshSession,
  LEGACY_REFRESH_SESSION_ID,
  parseRefreshSessions,
  pruneRefreshSessions,
  readRefreshTokenClaims,
  RefreshSession,
  RefreshSessionRecord,
  RefreshSessionStore,
  RefreshSessionTokens,
  serializeRefreshSessions,
} from './refresh-session.store';

interface TestUser {
  _id: string;
  refreshToken?: unknown;
}

interface UpdateFilter {
  _id: string;
  refreshToken?: unknown;
}

interface UpdateSet {
  $set: { refreshToken: unknown };
}

/** In-memory stand-in for the Mongoose model: one document, CAS semantics of `updateOne`. */
class FakeUserModel {
  doc: TestUser | null = { _id: 'u1' };
  /** Runs right before each `updateOne` CAS check — lets a test simulate a concurrent writer. */
  beforeUpdate: (() => void) | undefined;
  updates: { filter: UpdateFilter; update: UpdateSet }[] = [];

  findOne = vi.fn(() => ({
    lean: () => ({ exec: async () => (this.doc ? { ...this.doc } : null) }),
  }));

  updateOne = vi.fn((filter: UpdateFilter, update: UpdateSet) => ({
    exec: async () => {
      this.beforeUpdate?.();
      this.updates.push({ filter, update });

      const matches = !!this.doc
        && filter._id === this.doc._id
        && (!('refreshToken' in filter) || (filter.refreshToken ?? null) === (this.doc.refreshToken ?? null));

      if (matches) {
        this.doc = { ...this.doc, refreshToken: update.$set.refreshToken };
      }

      return { matchedCount: matches ? 1 : 0 };
    },
  }));

  get stored(): RefreshSessionRecord {
    return parseRefreshSessions(this.doc?.refreshToken);
  }
}

const fakeBcrypt = {
  hashPassword: vi.fn(async (value: string) => `h:${value}`),
  comparePassword: vi.fn(async (value: string, hash: string) => hash === `h:${value}`),
} as unknown as BcryptService;

const signer = new JwtService({ secret: 'secret' });

const issueFor = (sid: string, jti = `jti-${sid}-${Math.random()}`, withExp = true): RefreshSessionTokens => ({
  accessToken: signer.sign({ sid, typ: 'access' }),
  refreshToken: signer.sign({ sid, jti, typ: 'refresh' }, withExp ? { expiresIn: 60 } : {}),
});

const jtiOf = (token: string) => (signer.decode(token) as { jti: string }).jti;

describe('refresh-session primitives', () => {
  describe('parseRefreshSessions', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
      ['a non-string value', 42],
      ['a JSON value of an unknown shape', JSON.stringify({ foo: 'bar' })],
      ['a JSON null', 'null'],
    ])('should return no session for %s', (_, raw) => {
      expect(parseRefreshSessions(raw)).toEqual({ v: 2, sessions: {} });
    });

    it('should return a v2 record as is', () => {
      const record = { v: 2, sessions: { s1: { currentHash: 'h1' } } };

      expect(parseRefreshSessions(JSON.stringify(record))).toEqual(record);
    });

    it('should expose a legacy flat record as the legacy session', () => {
      const legacy = { currentHash: 'h1', previousHash: 'h0', rotatedAt: 1 };

      expect(parseRefreshSessions(JSON.stringify(legacy))).toEqual({
        v: 2,
        sessions: { [LEGACY_REFRESH_SESSION_ID]: legacy },
      });
    });

    it('should expose a bare bcrypt hash as the legacy session', () => {
      expect(parseRefreshSessions('$2b$10$hash')).toEqual({
        v: 2,
        sessions: { [LEGACY_REFRESH_SESSION_ID]: { currentHash: '$2b$10$hash' } },
      });
    });
  });

  describe('serializeRefreshSessions', () => {
    it('should return null when no session is left', () => {
      expect(serializeRefreshSessions({ v: 2, sessions: {} })).toBeNull();
    });

    it('should JSON-encode a record with sessions', () => {
      const record: RefreshSessionRecord = { v: 2, sessions: { s1: { currentHash: 'h' } } };

      expect(serializeRefreshSessions(record)).toBe(JSON.stringify(record));
    });
  });

  describe('pruneRefreshSessions', () => {
    it('should drop the expired sessions and keep the ones without expiresAt', () => {
      const record: RefreshSessionRecord = {
        v: 2,
        sessions: {
          expired: { currentHash: 'a', expiresAt: 100 },
          alive: { currentHash: 'b', expiresAt: 300 },
          forever: { currentHash: 'c' },
        },
      };

      expect(Object.keys(pruneRefreshSessions(record, 200).sessions).sort()).toEqual(['alive', 'forever']);
    });

    it('should evict the least recently used sessions beyond maxSessions', () => {
      const record: RefreshSessionRecord = {
        v: 2,
        sessions: {
          old: { currentHash: 'a', lastUsedAt: 1 },
          legacy: { currentHash: 'b' },
          recent: { currentHash: 'c', lastUsedAt: 3 },
          middle: { currentHash: 'd', lastUsedAt: 2 },
        },
      };

      expect(Object.keys(pruneRefreshSessions(record, 0, 2).sessions).sort()).toEqual(['middle', 'recent']);
    });

    it('should keep at least one session and default to DEFAULT_MAX_REFRESH_SESSIONS', () => {
      const sessions = Object.fromEntries(
        Array.from({ length: DEFAULT_MAX_REFRESH_SESSIONS + 2 }, (_, i) => [`s${i}`, { currentHash: 'h', lastUsedAt: i }]),
      );

      expect(Object.keys(pruneRefreshSessions({ v: 2, sessions }, 0).sessions)).toHaveLength(DEFAULT_MAX_REFRESH_SESSIONS);
      expect(Object.keys(pruneRefreshSessions({ v: 2, sessions }, 0, 0).sessions)).toEqual(['s11']);
    });
  });

  describe('findRefreshSession', () => {
    const record: RefreshSessionRecord = {
      v: 2,
      sessions: { s1: { currentHash: 'a' }, s2: { currentHash: 'b', migratedFrom: LEGACY_REFRESH_SESSION_ID } },
    };

    it('should find a session by its sid', () => {
      expect(findRefreshSession(record, 's1')).toEqual({ sid: 's1', session: record.sessions.s1 });
    });

    it('should resolve legacy to the session it was migrated into', () => {
      expect(findRefreshSession(record, LEGACY_REFRESH_SESSION_ID)).toEqual({ sid: 's2', session: record.sessions.s2 });
    });

    it('should return undefined for an unknown sid', () => {
      expect(findRefreshSession(record, 'nope')).toBeUndefined();
    });
  });

  describe('readRefreshTokenClaims', () => {
    it('should read jti and exp (in ms)', () => {
      const token = signer.sign({ jti: 'j1' }, { expiresIn: 60 });
      const { exp } = signer.decode(token) as { exp: number };

      expect(readRefreshTokenClaims(token)).toEqual({ jti: 'j1', expiresAt: exp * 1000 });
    });

    it('should fall back to an empty jti and no expiresAt', () => {
      expect(readRefreshTokenClaims(signer.sign({ foo: 'bar' }))).toEqual({ jti: '', expiresAt: undefined });
      expect(readRefreshTokenClaims('not-a-jwt')).toEqual({ jti: '', expiresAt: undefined });
    });
  });
});

describe('RefreshSessionStore', () => {
  let model: FakeUserModel;
  let store: RefreshSessionStore<TestUser>;

  const buildStore = (options = {}) =>
    new RefreshSessionStore<TestUser>(model as unknown as Model<TestUser>, 'refreshToken', options, fakeBcrypt);

  const seed = (sessions: Record<string, RefreshSession>) => {
    model.doc = { _id: 'u1', refreshToken: JSON.stringify({ v: 2, sessions }) };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    model = new FakeUserModel();
    store = buildStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should default to a real BcryptService and default options', () => {
    const defaultStore = new RefreshSessionStore(model as unknown as Model<TestUser>, 'refreshToken');

    expect(defaultStore['bcryptService']).toBeInstanceOf(BcryptService);
    expect(defaultStore['maxSessions']).toBe(DEFAULT_MAX_REFRESH_SESSIONS);
    expect(defaultStore['reuseWindowMs']).toBe(0);
    expect(defaultStore['revokeSessionOnReuse']).toBe(false);
  });

  describe('read', () => {
    it('should return no session when the user does not exist', async () => {
      model.doc = null;

      await expect(store.read('u1')).resolves.toEqual({ v: 2, sessions: {} });
    });
  });

  describe('mutate', () => {
    it('should not write when the user does not exist', async () => {
      model.doc = null;
      const mutate = vi.fn();

      await store.mutate('u1', mutate);

      expect(mutate).not.toHaveBeenCalled();
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('should not write when the mutator returns undefined', async () => {
      seed({ s1: { currentHash: 'a' } });

      const result = await store.mutate('u1', () => undefined);

      expect(result.sessions).toHaveProperty('s1');
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('should CAS on the raw value read (null when the field is missing)', async () => {
      await store.mutate('u1', (record) => ({ ...record, sessions: { s1: { currentHash: 'a' } } }));

      expect(model.updates[0].filter).toEqual({ _id: 'u1', refreshToken: null });
      expect(model.stored.sessions.s1).toEqual({ currentHash: 'a' });
    });

    it('should replay the mutator on the re-read record after a CAS miss', async () => {
      seed({ a: { currentHash: 'a', lastUsedAt: 1 } });
      let raced = false;
      model.beforeUpdate = () => {
        if (!raced) {
          raced = true;
          // Another device adds its session between our read and our write.
          model.doc.refreshToken = JSON.stringify({ v: 2, sessions: { a: { currentHash: 'a', lastUsedAt: 1 }, b: { currentHash: 'b', lastUsedAt: 2 } } });
        }
      };
      const mutate = vi.fn((record: RefreshSessionRecord, now: number) => ({
        v: 2 as const,
        sessions: { ...record.sessions, c: { currentHash: 'c', lastUsedAt: now } },
      }));

      await store.mutate('u1', mutate);

      expect(mutate).toHaveBeenCalledTimes(2);
      expect(Object.keys(model.stored.sessions).sort()).toEqual(['a', 'b', 'c']);
    });

    it('should throw a ConflictException once every attempt missed', async () => {
      model.beforeUpdate = () => {
        model.doc.refreshToken = `raced-${Math.random()}`;
      };

      await expect(store.mutate('u1', (record) => ({ ...record, sessions: { s: { currentHash: 'x' } } })))
      .rejects.toThrow(new ConflictException('Too many concurrent session updates, please retry'));
      expect(model.updateOne).toHaveBeenCalledTimes(3);
    });

    it('should purge expired sessions and evict beyond maxSessions before writing', async () => {
      store = buildStore({ maxSessions: 2 });
      seed({
        expired: { currentHash: 'e', expiresAt: 1 },
        oldest: { currentHash: 'o', lastUsedAt: 1 },
        newer: { currentHash: 'n', lastUsedAt: 2 },
      });

      await store.mutate('u1', (record, now) => ({
        v: 2,
        sessions: { ...record.sessions, fresh: { currentHash: 'f', lastUsedAt: now } },
      }));

      expect(Object.keys(model.stored.sessions).sort()).toEqual(['fresh', 'newer']);
    });
  });

  describe('createSession', () => {
    it('should add a session next to the existing ones, with expiresAt from the token exp', async () => {
      vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
      seed({ other: { currentHash: 'o', lastUsedAt: 1 } });
      const tokens = issueFor('s1', 'jti-1');

      await store.createSession('u1', 's1', tokens.refreshToken);

      expect(model.stored.sessions.other).toEqual({ currentHash: 'o', lastUsedAt: 1 });
      expect(model.stored.sessions.s1).toEqual({
        currentHash: 'h:jti-1',
        createdAt: 1_000_000,
        lastUsedAt: 1_000_000,
        expiresAt: readRefreshTokenClaims(tokens.refreshToken).expiresAt,
      });
    });

    it('should omit expiresAt when the token has no exp', async () => {
      await store.createSession('u1', 's1', issueFor('s1', 'jti-1', false).refreshToken);

      expect(model.stored.sessions.s1).not.toHaveProperty('expiresAt');
    });
  });

  describe('refreshSession', () => {
    it('should rotate only the caller session and keep the others', async () => {
      seed({ a: { currentHash: 'h:jti-a', createdAt: 5 }, b: { currentHash: 'h:jti-b' } });
      const issue = vi.fn((sid: string) => issueFor(sid, 'jti-a2'));

      const tokens = await store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issue);

      expect(issue).toHaveBeenCalledWith('a');
      expect(jtiOf(tokens.refreshToken)).toBe('jti-a2');
      expect(model.stored.sessions.b).toEqual({ currentHash: 'h:jti-b' });
      expect(model.stored.sessions.a).toMatchObject({
        currentHash: 'h:jti-a2',
        previousHash: 'h:jti-a',
        createdAt: 5,
        expiresAt: expect.any(Number),
      });
      expect(model.stored.sessions.a).not.toHaveProperty('cachedTokens');
      expect(fakeBcrypt.comparePassword).toHaveBeenCalledTimes(1);
    });

    it('should cache the issued pair when reuseWindowMs > 0 and set createdAt when missing', async () => {
      store = buildStore({ reuseWindowMs: 10_000 });
      seed({ a: { currentHash: 'h:jti-a' } });

      const tokens = await store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, (sid) => issueFor(sid, 'jti-a2', false));

      expect(model.stored.sessions.a.cachedTokens).toEqual(tokens);
      expect(model.stored.sessions.a.createdAt).toEqual(expect.any(Number));
      expect(model.stored.sessions.a).not.toHaveProperty('expiresAt');
    });

    it('should migrate the legacy session to a fresh sid on its first rotation', async () => {
      model.doc = { _id: 'u1', refreshToken: JSON.stringify({ currentHash: 'h:jti-old' }) };
      const issue = vi.fn((sid: string) => issueFor(sid, 'jti-new'));

      await store.refreshSession('u1', { jti: 'jti-old' }, issue);

      const newSid = issue.mock.calls[0][0];
      expect(newSid).not.toBe(LEGACY_REFRESH_SESSION_ID);
      expect(Object.keys(model.stored.sessions)).toEqual([newSid]);
      expect(model.stored.sessions[newSid]).toMatchObject({
        currentHash: 'h:jti-new',
        previousHash: 'h:jti-old',
        migratedFrom: LEGACY_REFRESH_SESSION_ID,
      });
    });

    it.each([
      ['the session is unknown', { b: { currentHash: 'h:jti-b' } }],
      ['the session is expired', { a: { currentHash: 'h:jti-a', expiresAt: 1 } }],
      ['the jti does not match and there is no previous hash', { a: { currentHash: 'h:other' } }],
      ['the jti matches neither the current nor the previous hash', { a: { currentHash: 'h:other', previousHash: 'h:older' } }],
    ])('should throw 401 when %s', async (_, sessions) => {
      seed(sessions);

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor))
      .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should throw 401 when the user has no session at all', async () => {
      model.doc = { _id: 'u1', refreshToken: '' };

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor))
      .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should return the cached pair when a superseded token is replayed within the grace window', async () => {
      store = buildStore({ reuseWindowMs: 10_000 });
      const cachedTokens = issueFor('a');
      seed({ a: { currentHash: 'h:jti-a2', previousHash: 'h:jti-a', rotatedAt: Date.now(), cachedTokens } });

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor)).resolves.toEqual(cachedTokens);
    });

    it('should resolve a legacy token replayed after migration within the grace window', async () => {
      store = buildStore({ reuseWindowMs: 10_000 });
      const cachedTokens = issueFor('new');
      seed({
        new: {
          currentHash: 'h:jti-new', previousHash: 'h:jti-old', rotatedAt: Date.now(), cachedTokens,
          migratedFrom: LEGACY_REFRESH_SESSION_ID,
        },
      });

      await expect(store.refreshSession('u1', { jti: 'jti-old' }, issueFor)).resolves.toEqual(cachedTokens);
      // Resolved through the migrated session: no compare against its current hash.
      expect(fakeBcrypt.comparePassword).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['the window is disabled', 0, 0],
      ['the window is over', 1_000, -5_000],
    ])('should throw 401 and keep the session on a replay outside the window when %s', async (_, reuseWindowMs, offset) => {
      store = buildStore({ reuseWindowMs });
      seed({
        a: { currentHash: 'h:jti-a2', previousHash: 'h:jti-a', rotatedAt: Date.now() + offset, cachedTokens: issueFor('a') },
        b: { currentHash: 'h:jti-b' },
      });

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor))
      .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
      expect(Object.keys(model.stored.sessions).sort()).toEqual(['a', 'b']);
    });

    it('should revoke only the replayed session when revokeSessionOnReuse is on', async () => {
      store = buildStore({ revokeSessionOnReuse: true });
      seed({ a: { currentHash: 'h:jti-a2', previousHash: 'h:jti-a', rotatedAt: 1 }, b: { currentHash: 'h:jti-b' } });

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor))
      .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
      expect(Object.keys(model.stored.sessions)).toEqual(['b']);
    });

    it('should replay the rotation when another session was written concurrently', async () => {
      seed({ a: { currentHash: 'h:jti-a' }, b: { currentHash: 'h:jti-b' } });
      let raced = false;
      model.beforeUpdate = () => {
        if (!raced) {
          raced = true;
          model.doc.refreshToken = JSON.stringify({ v: 2, sessions: { a: { currentHash: 'h:jti-a' }, b: { currentHash: 'h:jti-b2' } } });
        }
      };

      await store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, (sid) => issueFor(sid, 'jti-a2'));

      expect(model.stored.sessions.a.currentHash).toBe('h:jti-a2');
      expect(model.stored.sessions.b.currentHash).toBe('h:jti-b2');
    });

    it('should return the winner cached pair when the same session was rotated concurrently', async () => {
      store = buildStore({ reuseWindowMs: 10_000 });
      seed({ a: { currentHash: 'h:jti-a' } });
      const winnerTokens = issueFor('a', 'jti-winner');
      model.beforeUpdate = () => {
        model.beforeUpdate = undefined;
        model.doc.refreshToken = JSON.stringify({
          v: 2,
          sessions: { a: { currentHash: 'h:jti-winner', previousHash: 'h:jti-a', rotatedAt: Date.now(), cachedTokens: winnerTokens } },
        });
      };

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor)).resolves.toEqual(winnerTokens);
    });

    it.each([
      ['the winner has no grace pair', 0, { a: { currentHash: 'h:jti-winner', previousHash: 'h:jti-a', rotatedAt: Date.now() } }],
      ['the session was revoked meanwhile', 10_000, { b: { currentHash: 'h:jti-b' } }],
      ['the previous hash of the winner is another token', 10_000, {
        a: { currentHash: 'h:jti-w', previousHash: 'h:jti-z', rotatedAt: Date.now(), cachedTokens: { accessToken: 'x', refreshToken: 'y' } },
      }],
    ])('should throw 401 on a same-session race when %s', async (_, reuseWindowMs, winnerSessions) => {
      store = buildStore({ reuseWindowMs });
      seed({ a: { currentHash: 'h:jti-a' } });
      model.beforeUpdate = () => {
        model.beforeUpdate = undefined;
        model.doc.refreshToken = JSON.stringify({ v: 2, sessions: winnerSessions });
      };

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor))
      .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should rethrow an unexpected error of the write', async () => {
      seed({ a: { currentHash: 'h:jti-a' } });
      model.beforeUpdate = () => {
        throw new Error('db down');
      };

      await expect(store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor)).rejects.toThrow('db down');
    });

    it('should only validate and touch lastUsedAt when rotate is false', async () => {
      seed({ a: { currentHash: 'h:jti-a', lastUsedAt: 1 } });
      const issue = vi.fn((sid: string) => issueFor(sid));

      await store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issue, false);

      expect(issue).toHaveBeenCalledWith('a');
      expect(model.stored.sessions.a.currentHash).toBe('h:jti-a');
      expect(model.stored.sessions.a.lastUsedAt).toBeGreaterThan(1);
    });

    it('should not write when the session disappears before the touch (rotate false)', async () => {
      seed({ a: { currentHash: 'h:jti-a' } });
      model.findOne
      .mockImplementationOnce(() => ({ lean: () => ({ exec: async () => ({ ...model.doc }) }) }))
      .mockImplementationOnce(() => ({ lean: () => ({ exec: async () => ({ _id: 'u1', refreshToken: null }) }) }));

      await store.refreshSession('u1', { jti: 'jti-a', sid: 'a' }, issueFor, false);

      expect(model.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('reissueSession', () => {
    it('should rotate the session in place and keep the others', async () => {
      store = buildStore({ reuseWindowMs: 5_000 });
      seed({ a: { currentHash: 'h:jti-a', createdAt: 1 }, b: { currentHash: 'h:jti-b' } });
      const tokens = issueFor('a', 'jti-a2');

      await expect(store.reissueSession('u1', 'a', tokens)).resolves.toBe(true);

      expect(model.stored.sessions.a).toMatchObject({
        currentHash: 'h:jti-a2',
        previousHash: 'h:jti-a',
        createdAt: 1,
        cachedTokens: tokens,
        expiresAt: expect.any(Number),
      });
      expect(model.stored.sessions.b).toEqual({ currentHash: 'h:jti-b' });
    });

    it('should not cache the pair nor set expiresAt without window / exp', async () => {
      seed({ a: { currentHash: 'h:jti-a' } });

      await store.reissueSession('u1', 'a', issueFor('a', 'jti-a2', false));

      expect(model.stored.sessions.a).not.toHaveProperty('cachedTokens');
      expect(model.stored.sessions.a).not.toHaveProperty('expiresAt');
    });

    it('should return false and write nothing when the session no longer exists', async () => {
      seed({ b: { currentHash: 'h:jti-b' } });

      await expect(store.reissueSession('u1', 'a', issueFor('a'))).resolves.toBe(false);
      expect(model.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should remove only the given session', async () => {
      seed({ a: { currentHash: 'a' }, b: { currentHash: 'b' } });

      await store.revokeSession('u1', 'a');

      expect(Object.keys(model.stored.sessions)).toEqual(['b']);
    });

    it('should store null once the last session is revoked', async () => {
      model.doc = { _id: 'u1', refreshToken: JSON.stringify({ currentHash: 'legacy-hash' }) };

      await store.revokeSession('u1');

      expect(model.doc.refreshToken).toBeNull();
    });

    it('should not write when the session does not exist', async () => {
      seed({ b: { currentHash: 'b' } });

      await store.revokeSession('u1', 'a');

      expect(model.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('should set the field to null', async () => {
      seed({ a: { currentHash: 'a' }, b: { currentHash: 'b' } });

      await store.revokeAllSessions('u1');

      expect(model.updates[0]).toEqual({ filter: { _id: 'u1' }, update: { $set: { refreshToken: null } } });
      expect(model.doc.refreshToken).toBeNull();
    });
  });
});
