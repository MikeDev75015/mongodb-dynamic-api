import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, DynamicApiRouteConfig } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for the guard fail-open bug on **standard** routes whose underlying query matches
 * zero documents (audit finding #20 — the same failure mode as #8, but #8's `authAbilityPredicate`
 * fix only reached `CustomRouteConfig`; `BaseRouteConfig` — extended by every standard
 * `CreateOne`/`GetMany`/etc. route — had no equivalent escape hatch at all until now).
 *
 * `CreateOne` never has a document to check yet, and `GetMany` on a brand-new/empty collection
 * matches zero documents: both fall back to `findManyDocumentsWithAbilityPredicate`, which scans
 * `entity`'s own collection and calls the predicate once per document found. Zero documents means
 * `documents.forEach(...)` never runs, so the predicate is never evaluated — the Guard silently
 * returns `true`, granting access to **any authenticated user**.
 *
 * `authAbilityPredicate` fixes this by evaluating directly against `(user, body)`, never by
 * scanning a collection — there is no vacuous-pass case. It's available at the route level
 * (`DynamicApiRouteConfig.authAbilityPredicate`) and at the controller level for several route
 * types at once (`controllerOptions.abilityPredicates[].authAbilityPredicate`) — both covered here.
 */
describe('DynamicApiModule forFeature - standard route authAbilityPredicate (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'std_auth_predicate_users' })
  class StdAuthPredicateUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: 'user' })
    role: string;
  }

  // Deliberately never seeded with fixtures — every test starts from the freshly-truncated,
  // empty collection `createTestingApp` leaves behind, reproducing "the very first write to a
  // brand-new entity" the audit finding was based on.
  @Schema({ collection: 'std_auth_predicate_entries' })
  class StdAuthPredicateEntryEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    title: string;
  }

  const registerAndLogin = async (email: string, role: string) => {
    await server.post('/auth/register', { email, password: 'password123', role });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
    const { body: account } = await server.get('/auth/account', { authToken: accessToken });

    return { accessToken, id: account.id as string };
  };

  const isAdminRole = (
    _entity: StdAuthPredicateEntryEntity,
    user: { role: string },
  ) => user.role === 'admin';

  const setupWithRoutes = async (routes: DynamicApiRouteConfig<StdAuthPredicateEntryEntity>[]) => {
    await initApp(
      {
        entity: StdAuthPredicateEntryEntity,
        controllerOptions: { path: 'std-auth-predicate-entries' },
        routes,
      },
      {
        useAuth: {
          userEntity: StdAuthPredicateUserEntity,
          login: { loginField: 'email', passwordField: 'password', additionalFields: ['role'] },
          register: {
            additionalFields: [{ name: 'role', required: false }],
          },
        },
      },
    );
  };

  describe('abilityPredicate alone on CreateOne — the fail-open bug this option exists to fix', () => {
    beforeEach(() => setupWithRoutes([
      { type: 'CreateOne', abilityPredicate: isAdminRole },
      { type: 'GetMany' },
    ]));

    it('demonstrates the fail-open bug: a non-admin creates a document because the collection is empty', async () => {
      const nonAdmin = await registerAndLogin('member@std-auth-predicate.co', 'user');

      const { status } = await server.post(
        '/std-auth-predicate-entries',
        { title: 'should have been denied' },
        { authToken: nonAdmin.accessToken },
      );

      // Wrong, but this is exactly the pre-existing behavior: findManyDocumentsWithAbilityPredicate
      // finds zero documents in the empty collection, so isAdminRole is never actually evaluated —
      // the Guard vacuously returns true. This test locks in the failure mode being fixed, not the
      // desired outcome.
      expect(status).toBe(201);
    });
  });

  describe('authAbilityPredicate on CreateOne — the fix (route-level)', () => {
    beforeEach(() => setupWithRoutes([
      { type: 'CreateOne', authAbilityPredicate: (user: { role: string }) => user.role === 'admin' },
      { type: 'GetMany' },
    ]));

    it('denies a non-admin, regardless of the backing collection being empty', async () => {
      const nonAdmin = await registerAndLogin('member2@std-auth-predicate.co', 'user');

      const { status } = await server.post(
        '/std-auth-predicate-entries',
        { title: 'should be denied' },
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(403);
    });

    it('allows an admin', async () => {
      const admin = await registerAndLogin('admin@std-auth-predicate.co', 'admin');

      const { status, body } = await server.post(
        '/std-auth-predicate-entries',
        { title: 'allowed' },
        { authToken: admin.accessToken },
      );

      expect(status).toBe(201);
      expect(body.title).toBe('allowed');
    });

    it('denies an unauthenticated request', async () => {
      const { status } = await server.post(
        '/std-auth-predicate-entries',
        { title: 'no token' },
      );

      expect(status).toBe(401);
    });
  });

  describe('abilityPredicate alone on GetMany — the fail-open bug this option exists to fix', () => {
    beforeEach(() => setupWithRoutes([
      { type: 'GetMany', abilityPredicate: isAdminRole },
    ]));

    it('demonstrates the fail-open bug: a non-admin gets 200 because the collection is empty', async () => {
      const nonAdmin = await registerAndLogin('member3@std-auth-predicate.co', 'user');

      const { status } = await server.get(
        '/std-auth-predicate-entries',
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(200);
    });
  });

  describe('authAbilityPredicate on GetMany — the fix (route-level)', () => {
    beforeEach(() => setupWithRoutes([
      { type: 'GetMany', authAbilityPredicate: (user: { role: string }) => user.role === 'admin' },
    ]));

    it('denies a non-admin, regardless of the backing collection being empty', async () => {
      const nonAdmin = await registerAndLogin('member4@std-auth-predicate.co', 'user');

      const { status } = await server.get(
        '/std-auth-predicate-entries',
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(403);
    });

    it('allows an admin', async () => {
      const admin = await registerAndLogin('admin2@std-auth-predicate.co', 'admin');

      const { status, body } = await server.get(
        '/std-auth-predicate-entries',
        { authToken: admin.accessToken },
      );

      expect(status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('authAbilityPredicate via controllerOptions.abilityPredicates — the fix (controller-level shorthand)', () => {
    beforeEach(async () => {
      await initApp(
        {
          entity: StdAuthPredicateEntryEntity,
          controllerOptions: {
            path: 'std-auth-predicate-entries',
            abilityPredicates: [
              {
                targets: ['CreateOne', 'GetMany'],
                predicate: () => true, // no per-document rule needed for this blanket admin-only gate
                authAbilityPredicate: (user: { role: string }) => user.role === 'admin',
              },
            ],
          },
          routes: [{ type: 'CreateOne' }, { type: 'GetMany' }],
        },
        {
          useAuth: {
            userEntity: StdAuthPredicateUserEntity,
            login: { loginField: 'email', passwordField: 'password', additionalFields: ['role'] },
            register: {
              additionalFields: [{ name: 'role', required: false }],
            },
          },
        },
      );
    });

    it('denies a non-admin on CreateOne', async () => {
      const nonAdmin = await registerAndLogin('member5@std-auth-predicate.co', 'user');

      const { status } = await server.post(
        '/std-auth-predicate-entries',
        { title: 'denied' },
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(403);
    });

    it('denies a non-admin on GetMany', async () => {
      const nonAdmin = await registerAndLogin('member6@std-auth-predicate.co', 'user');

      const { status } = await server.get(
        '/std-auth-predicate-entries',
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(403);
    });

    it('allows an admin on both CreateOne and GetMany', async () => {
      const admin = await registerAndLogin('admin3@std-auth-predicate.co', 'admin');

      const createResponse = await server.post(
        '/std-auth-predicate-entries',
        { title: 'allowed' },
        { authToken: admin.accessToken },
      );
      const getManyResponse = await server.get(
        '/std-auth-predicate-entries',
        { authToken: admin.accessToken },
      );

      expect(createResponse.status).toBe(201);
      expect(getManyResponse.status).toBe(200);
      expect(getManyResponse.body).toHaveLength(1);
    });
  });
});
