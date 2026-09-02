import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { createBasicUserEntity } from '../shared';

describe('DynamicApiModule forRoot - Auth rate limiting (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('POST /auth/login with rateLimit configured', () => {
    const UserEntity = createBasicUserEntity();

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
          DynamicApiModule.forRoot(uri, {
            useAuth: {
              userEntity: UserEntity,
              login: { rateLimit: { limit: 2, ttl: 60000 } },
            },
          }),
        ],
      }).compile();

      await createTestingApp(moduleRef);
    });

    it('rejects with 429 once the configured limit is exceeded', async () => {
      const credentials = { email: 'ratelimit@test.co', password: 'test' };

      const first = await server.post('/auth/login', credentials);
      const second = await server.post('/auth/login', credentials);
      const third = await server.post('/auth/login', credentials);

      // Credentials don't need to be valid — the guard counts every request before the
      // handler runs, so all three hit the same 401 outcome except the throttled one.
      expect(first.status).toBe(401);
      expect(second.status).toBe(401);
      expect(third.status).toBe(429);
    });
  });

  describe('POST /auth/login without rateLimit configured', () => {
    const UserEntity = createBasicUserEntity();

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DynamicApiModule.forRoot(uri, { useAuth: { userEntity: UserEntity } })],
      }).compile();

      await createTestingApp(moduleRef);
    });

    it('never throttles when no rateLimit option is set', async () => {
      const credentials = { email: 'no-limit@test.co', password: 'test' };

      const requests = Array.from({ length: 5 }, () => server.post('/auth/login', credentials));
      const results = await Promise.all(requests);

      results.forEach(({ status }) => expect(status).toBe(401));
    });
  });
});
