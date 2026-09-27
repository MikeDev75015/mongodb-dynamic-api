import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';
import { BcryptService } from '../services/bcrypt/bcrypt.service';

/**
 * Session id under which a pre-multi-session record (flat `{ currentHash, … }` object or bare
 * bcrypt hash) is exposed by {@link parseRefreshSessions}, and the id assumed for a refresh token
 * that carries no `sid` claim.
 */
const LEGACY_REFRESH_SESSION_ID = 'legacy';

/** Default for `refreshToken.maxSessions`. */
const DEFAULT_MAX_REFRESH_SESSIONS = 10;

/** Compare-and-swap attempts made by {@link RefreshSessionStore.mutate} before giving up. */
const REFRESH_SESSION_CAS_ATTEMPTS = 3;

/** `{ accessToken, refreshToken }` pair handled by the refresh-session primitives. */
interface RefreshSessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** One device / login session inside a {@link RefreshSessionRecord}. */
interface RefreshSession {
  /** bcrypt hash of the jti of the refresh token currently valid for this session. */
  currentHash: string;
  /** bcrypt hash of the jti superseded by the last rotation — grace window + reuse detection. */
  previousHash?: string;
  /** Epoch ms of the last rotation. */
  rotatedAt?: number;
  /** Pair issued by the last rotation, replayed to a grace-window hit (only when `reuseWindowMs > 0`). */
  cachedTokens?: RefreshSessionTokens;
  /** Epoch ms of the login that opened the session. */
  createdAt?: number;
  /** Epoch ms of the last login / rotation — the eviction order once `maxSessions` is exceeded. */
  lastUsedAt?: number;
  /** Epoch ms after which the session is purged — the `exp` of its latest refresh token. */
  expiresAt?: number;
  /**
   * Id of the session this one was migrated from (only `'legacy'` today), so a refresh token of the
   * old session replayed within the grace window still resolves to the migrated session.
   */
  migratedFrom?: string;
}

/**
 * Value stored — JSON-encoded — in `refreshTokenField` when `refreshToken.multiSession` is on:
 * one {@link RefreshSession} per `sid`.
 */
interface RefreshSessionRecord {
  v: 2;
  sessions: Record<string, RefreshSession>;
}

/** Record read by the pre-multi-session format (still produced when `multiSession` is off). */
interface LegacyRefreshTokenRecord {
  currentHash: string;
  previousHash?: string;
  rotatedAt?: number;
  cachedTokens?: RefreshSessionTokens;
}

/** Options of a {@link RefreshSessionStore}. */
interface RefreshSessionStoreOptions {
  /** Max concurrent sessions per user — the least recently used one is evicted beyond. Default 10. */
  maxSessions?: number;
  /** Grace window (ms) during which the token superseded by the last rotation is still accepted. Default 0. */
  reuseWindowMs?: number;
  /** Revoke the session when a superseded token is replayed outside the grace window. Default false. */
  revokeSessionOnReuse?: boolean;
}

/** Claims of an incoming refresh token needed to resolve and validate its session. */
interface RefreshSessionClaims {
  /** `jti` of the incoming refresh token. */
  jti: string;
  /** `sid` of the incoming refresh token — {@link LEGACY_REFRESH_SESSION_ID} when absent. */
  sid?: string;
}

/**
 * Signs a new `{ accessToken, refreshToken }` pair whose tokens carry `sid`. The refresh token must
 * carry a `jti` (its hash is what gets stored) and, ideally, an `exp` (used as `expiresAt`).
 */
type RefreshSessionIssuer = (sid: string) => RefreshSessionTokens | Promise<RefreshSessionTokens>;

/** Mutation applied by {@link RefreshSessionStore.mutate}; `undefined` means "nothing to write". */
type RefreshSessionMutator = (
  record: RefreshSessionRecord,
  now: number,
) => RefreshSessionRecord | undefined | Promise<RefreshSessionRecord | undefined>;

/** Session found by {@link findRefreshSession}. */
interface ResolvedRefreshSession {
  sid: string;
  session: RefreshSession;
}

/** Thrown inside a rotation mutator when the targeted session changed since it was validated. */
class RefreshSessionChangedError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function emptyRefreshSessions(): RefreshSessionRecord {
  return { v: 2, sessions: {} };
}

/**
 * Parses the value stored in a refresh-token field into the multi-session format:
 * - `{ v: 2, sessions }` → returned as is;
 * - legacy flat `{ currentHash, … }` or bare bcrypt hash → `{ v: 2, sessions: { legacy: … } }`;
 * - `''` / `null` / `undefined` / anything else → no session at all.
 *
 * @example
 * ```typescript
 * import { parseRefreshSessions } from 'mongodb-dynamic-api';
 *
 * const { sessions } = parseRefreshSessions(user.familyPlayRefreshToken);
 * const deviceCount = Object.keys(sessions).length;
 * ```
 */
function parseRefreshSessions(raw: unknown): RefreshSessionRecord {
  if (typeof raw !== 'string' || !raw) {
    return emptyRefreshSessions();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON — the whole string is a bare bcrypt hash (oldest format).
    return { v: 2, sessions: { [LEGACY_REFRESH_SESSION_ID]: { currentHash: raw } } };
  }

  if (isObject(parsed) && parsed.v === 2 && isObject(parsed.sessions)) {
    return { v: 2, sessions: { ...(parsed.sessions as Record<string, RefreshSession>) } };
  }

  if (isObject(parsed) && typeof parsed.currentHash === 'string') {
    return { v: 2, sessions: { [LEGACY_REFRESH_SESSION_ID]: { ...(parsed as unknown as LegacyRefreshTokenRecord) } } };
  }

  return emptyRefreshSessions();
}

/** Serializes `record` for storage — `null` once no session is left. */
function serializeRefreshSessions(record: RefreshSessionRecord): string | null {
  return Object.keys(record.sessions).length ? JSON.stringify(record) : null;
}

/**
 * Drops the sessions whose `expiresAt` is past, then evicts the least recently used ones
 * (smallest `lastUsedAt`, missing = oldest) until at most `maxSessions` remain.
 */
function pruneRefreshSessions(
  record: RefreshSessionRecord,
  now: number,
  maxSessions = DEFAULT_MAX_REFRESH_SESSIONS,
): RefreshSessionRecord {
  const alive = Object.entries(record.sessions).filter(([, s]) => !s.expiresAt || s.expiresAt > now);
  alive.sort(([, a], [, b]) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  const kept = alive.slice(0, Math.max(1, maxSessions));

  return { v: 2, sessions: Object.fromEntries(kept) };
}

/**
 * Finds session `sid` in `record`. A `'legacy'` lookup falls back to the session the legacy
 * record was migrated into, so a legacy token replayed within the grace window still resolves.
 */
function findRefreshSession(record: RefreshSessionRecord, sid: string): ResolvedRefreshSession | undefined {
  if (record.sessions[sid]) {
    return { sid, session: record.sessions[sid] };
  }

  const migrated = Object.entries(record.sessions).find(([, s]) => s.migratedFrom === sid);
  return migrated ? { sid: migrated[0], session: migrated[1] } : undefined;
}

/** Decodes the `jti` / `exp` claims of a refresh token (no signature check — the token was just signed). */
function readRefreshTokenClaims(refreshToken: string): { jti: string; expiresAt?: number } {
  const decoded = new JwtService().decode(refreshToken);
  const claims = isObject(decoded) ? decoded : {};

  return {
    jti: typeof claims.jti === 'string' ? claims.jti : '',
    expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : undefined,
  };
}

/**
 * Multi-session refresh-token storage over a single string field of a Mongoose model — the engine
 * behind `refreshToken.multiSession`, exported for apps that keep a second refresh-token field
 * with their own route (e.g. a companion app minted through `mintTokenPair`).
 *
 * Every write is a compare-and-swap on the whole stored string, replayed (3 attempts) against the
 * freshly re-read record on a miss, so two devices writing at the same time never erase each
 * other's session.
 *
 * @example — a companion app with its own refresh route over a dedicated field
 * ```typescript
 * import { Controller, Headers, Post } from '@nestjs/common';
 * import { JwtService } from '@nestjs/jwt';
 * import { DynamicApiEntityService, mintTokenPair, Public, RefreshSessionStore } from 'mongodb-dynamic-api';
 * import { User } from './user.entity';
 *
 * @Controller('family-play/auth')
 * export class FamilyPlayAuthController {
 *   constructor(private readonly jwtService: JwtService) {}
 *
 *   @Public()
 *   @Post('refresh-token')
 *   async refresh(@Headers('authorization') authorization: string) {
 *     const rawToken = authorization.replace('Bearer ', '');
 *     const { id, jti, sid } = await this.jwtService.verifyAsync(rawToken, { secret: process.env.JWT_REFRESH_SECRET });
 *     const model = await DynamicApiEntityService.getModel(User);
 *     const store = new RefreshSessionStore(model, 'familyPlayRefreshToken', { reuseWindowMs: 10_000 });
 *     const user = await model.findById(id).lean();
 *
 *     return store.refreshSession(id, { jti, sid }, async (newSid) =>
 *       mintTokenPair(User, { ...user, id }, { refreshTokenField: 'familyPlayRefreshToken', multiSession: true, sid: newSid, persist: false }),
 *     );
 *   }
 * }
 * ```
 */
class RefreshSessionStore<Entity = unknown> {
  private readonly logger = new MongoDBDynamicApiLogger('RefreshSessionStore');
  private readonly maxSessions: number;
  private readonly reuseWindowMs: number;
  private readonly revokeSessionOnReuse: boolean;

  constructor(
    private readonly model: Model<Entity>,
    private readonly field: keyof Entity | string,
    options: RefreshSessionStoreOptions = {},
    private readonly bcryptService: BcryptService = new BcryptService(),
  ) {
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_REFRESH_SESSIONS;
    this.reuseWindowMs = options.reuseWindowMs ?? 0;
    this.revokeSessionOnReuse = options.revokeSessionOnReuse ?? false;
  }

  /** Reads and parses the sessions of `userId` (none when the user does not exist). */
  async read(userId: unknown): Promise<RefreshSessionRecord> {
    return parseRefreshSessions((await this.readRaw(userId)).raw);
  }

  /**
   * Applies `mutate` to the stored record with a compare-and-swap write, re-reading and replaying
   * `mutate` on a CAS miss (3 attempts). Expired sessions are purged and the least recently used
   * ones evicted beyond `maxSessions` before each write. Returns the record written — or the one
   * read, when `mutate` returns `undefined` or the user does not exist.
   *
   * @throws ConflictException when every attempt lost the race.
   */
  async mutate(userId: unknown, mutate: RefreshSessionMutator): Promise<RefreshSessionRecord> {
    for (let attempt = 1; attempt <= REFRESH_SESSION_CAS_ATTEMPTS; attempt++) {
      const { exists, raw } = await this.readRaw(userId);
      const record = parseRefreshSessions(raw);
      const now = Date.now();
      const next = exists ? await mutate(record, now) : undefined;

      if (!next) {
        return record;
      }

      const pruned = pruneRefreshSessions(next, now, this.maxSessions);
      const result = await this.model.updateOne(
        { _id: userId, [this.field]: raw ?? null } as FilterQuery<Entity>,
        { $set: { [this.field]: serializeRefreshSessions(pruned) } } as UpdateQuery<Entity>,
      ).exec();

      if (result.matchedCount > 0) {
        return pruned;
      }

      this.logger.debug('CAS miss on refresh sessions — replaying on the re-read record', { userId, attempt });
    }

    throw new ConflictException('Too many concurrent session updates, please retry');
  }

  /**
   * Opens session `sid` for the refresh token `refreshToken` (its `jti` is hashed, its `exp`
   * becomes the session's `expiresAt`), keeping every other session of the user.
   */
  async createSession(userId: unknown, sid: string, refreshToken: string): Promise<void> {
    const { jti, expiresAt } = readRefreshTokenClaims(refreshToken);
    const currentHash = await this.bcryptService.hashPassword(jti);

    await this.mutate(userId, (record, now) => ({
      v: 2,
      sessions: {
        ...record.sessions,
        [sid]: { currentHash, createdAt: now, lastUsedAt: now, ...(expiresAt ? { expiresAt } : {}) },
      },
    }));
  }

  /**
   * Validates the incoming refresh token against its own session only (one bcrypt compare on
   * `currentHash`) and rotates that session — every other session is left untouched.
   *
   * - `sid` absent → the `'legacy'` session, migrated to a fresh `sid` on this first rotation;
   * - superseded token within `reuseWindowMs` → the pair cached by the winning rotation;
   * - superseded token outside the window → 401, and the session is revoked when
   *   `revokeSessionOnReuse` is on;
   * - unknown / expired session or mismatched jti → 401.
   *
   * @param issue Signs the new pair for the given `sid`.
   * @param rotate `false` only validates (persistent-token mode) and refreshes `lastUsedAt`.
   */
  async refreshSession(
    userId: unknown,
    { jti, sid = LEGACY_REFRESH_SESSION_ID }: RefreshSessionClaims,
    issue: RefreshSessionIssuer,
    rotate = true,
  ): Promise<RefreshSessionTokens> {
    const found = findRefreshSession(await this.read(userId), sid);

    if (!found || (found.session.expiresAt && found.session.expiresAt <= Date.now())) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isCurrent = found.sid === sid && await this.bcryptService.comparePassword(jti, found.session.currentHash);

    if (!isCurrent) {
      return this.handleSupersededToken(userId, found, jti);
    }

    if (!rotate) {
      await this.touchSession(userId, sid);
      return issue(sid);
    }

    const newSid = sid === LEGACY_REFRESH_SESSION_ID ? randomUUID() : sid;
    const tokens = await issue(newSid);
    const { jti: newJti, expiresAt } = readRefreshTokenClaims(tokens.refreshToken);
    const newHash = await this.bcryptService.hashPassword(newJti);
    const validatedHash = found.session.currentHash;

    try {
      await this.mutate(userId, (record, now) => {
        const current = record.sessions[sid];

        // Another device writing its own session only moves the CAS: replay on the re-read record.
        // This session's hash moving means a concurrent rotation of this very session won.
        if (current?.currentHash !== validatedHash) {
          throw new RefreshSessionChangedError();
        }

        const { [sid]: _rotated, ...others } = record.sessions;
        const rotated: RefreshSession = {
          currentHash: newHash,
          previousHash: validatedHash,
          rotatedAt: now,
          createdAt: current.createdAt ?? now,
          lastUsedAt: now,
          ...(expiresAt ? { expiresAt } : {}),
          ...(this.reuseWindowMs > 0 ? { cachedTokens: tokens } : {}),
          ...(newSid === sid ? {} : { migratedFrom: sid }),
        };

        return { v: 2, sessions: { ...others, [newSid]: rotated } };
      });
    } catch (error) {
      if (!(error instanceof RefreshSessionChangedError)) {
        throw error;
      }

      this.logger.debug('Concurrent rotation of the same session — checking its grace window', { userId, sid });
      const winner = findRefreshSession(await this.read(userId), sid);
      const cached = winner ? await this.checkGraceWindow(jti, winner.session) : null;

      if (cached) {
        return cached;
      }

      throw new UnauthorizedException('Invalid refresh token');
    }

    return tokens;
  }

  /**
   * Rotates session `sid` without validating an incoming token — for a flow that already proved
   * the caller owns the session (e.g. `refreshTokenOnUpdate` behind a valid access token).
   * The previous token of the session stays usable within the grace window.
   * Returns `false` (nothing written) when the session no longer exists.
   */
  async reissueSession(userId: unknown, sid: string, tokens: RefreshSessionTokens): Promise<boolean> {
    const { jti, expiresAt } = readRefreshTokenClaims(tokens.refreshToken);
    const newHash = await this.bcryptService.hashPassword(jti);
    let reissued = false;

    await this.mutate(userId, (record, now) => {
      const current = record.sessions[sid];
      reissued = !!current;

      if (!current) {
        return undefined;
      }

      return {
        v: 2,
        sessions: {
          ...record.sessions,
          [sid]: {
            ...current,
            currentHash: newHash,
            previousHash: current.currentHash,
            rotatedAt: now,
            lastUsedAt: now,
            ...(expiresAt ? { expiresAt } : {}),
            ...(this.reuseWindowMs > 0 ? { cachedTokens: tokens } : {}),
          },
        },
      };
    });

    return reissued;
  }

  /** Revokes session `sid` only (the `'legacy'` session when `sid` is absent). */
  async revokeSession(userId: unknown, sid: string = LEGACY_REFRESH_SESSION_ID): Promise<void> {
    await this.mutate(userId, (record) => {
      const found = findRefreshSession(record, sid);

      if (!found) {
        return undefined;
      }

      const { [found.sid]: _revoked, ...others } = record.sessions;
      return { v: 2, sessions: others };
    });
  }

  /** Revokes every session of `userId` at once. */
  async revokeAllSessions(userId: unknown): Promise<void> {
    await this.model.updateOne(
      { _id: userId } as FilterQuery<Entity>,
      { $set: { [this.field]: null } } as UpdateQuery<Entity>,
    ).exec();
  }

  private async readRaw(userId: unknown): Promise<{ exists: boolean; raw: unknown }> {
    const doc = await this.model.findOne(
      { _id: userId } as FilterQuery<Entity>,
      { [this.field]: 1 },
    ).lean<Record<string, unknown>>().exec();

    return { exists: !!doc, raw: doc?.[this.field as string] };
  }

  private async touchSession(userId: unknown, sid: string): Promise<void> {
    await this.mutate(userId, (record, now) => {
      const current = record.sessions[sid];

      if (!current) {
        return undefined;
      }

      return { v: 2, sessions: { ...record.sessions, [sid]: { ...current, lastUsedAt: now } } };
    });
  }

  private async handleSupersededToken(
    userId: unknown,
    { sid, session }: ResolvedRefreshSession,
    jti: string,
  ): Promise<RefreshSessionTokens> {
    const isPrevious = !!session.previousHash && await this.bcryptService.comparePassword(jti, session.previousHash);

    if (isPrevious) {
      const cached = this.readGraceTokens(session);

      if (cached) {
        this.logger.debug('Refresh token reused within grace window — returning cached pair', { userId, sid });
        return cached;
      }

      this.logger.warn('Superseded refresh token replayed outside the grace window', { userId, sid });

      if (this.revokeSessionOnReuse) {
        await this.revokeSession(userId, sid);
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  private async checkGraceWindow(jti: string, session: RefreshSession): Promise<RefreshSessionTokens | null> {
    const cached = this.readGraceTokens(session);

    // readGraceTokens only returns a pair when previousHash is set.
    if (!cached || !(await this.bcryptService.comparePassword(jti, session.previousHash as string))) {
      return null;
    }

    return cached;
  }

  /** Cached pair of `session` when its last rotation is still within the grace window. */
  private readGraceTokens(session: RefreshSession): RefreshSessionTokens | null {
    if (this.reuseWindowMs <= 0 || !session.previousHash || !session.rotatedAt || !session.cachedTokens) {
      return null;
    }

    return Date.now() - session.rotatedAt <= this.reuseWindowMs ? session.cachedTokens : null;
  }
}

export {
  DEFAULT_MAX_REFRESH_SESSIONS,
  LEGACY_REFRESH_SESSION_ID,
  RefreshSessionStore,
  findRefreshSession,
  parseRefreshSessions,
  pruneRefreshSessions,
  readRefreshTokenClaims,
  serializeRefreshSessions,
};
export type {
  LegacyRefreshTokenRecord,
  RefreshSession,
  RefreshSessionClaims,
  RefreshSessionIssuer,
  RefreshSessionMutator,
  RefreshSessionRecord,
  RefreshSessionStoreOptions,
  RefreshSessionTokens,
};
