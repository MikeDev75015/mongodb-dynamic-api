import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for the guard fail-open bug on document-less custom routes (audit finding #8):
 * a custom route with no `:id`/`targetParam` (an admin dashboard, a bulk action, ...) and an
 * `abilityPredicate` falls back to `findManyDocumentsWithAbilityPredicate`, which scans
 * `entity`'s own collection and calls the predicate once per document found. On an empty
 * collection (e.g. an audit-log entity before any moderation action ever happened), the scan
 * finds nothing to check — the predicate never runs, and the Guard returns `true` — granting
 * access to **any authenticated user**, not just the ones the predicate would actually allow.
 *
 * `authAbilityPredicate` fixes this by evaluating directly against `(user, body)`, never by
 * scanning a collection — there is no vacuous-pass case.
 */
describe('DynamicApiModule forFeature - custom route authAbilityPredicate (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'auth_predicate_users' })
  class AuthPredicateUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: 'user' })
    role: string;
  }

  // Entity backing the document-less admin route below — deliberately never written to by any
  // test in this file, reproducing the real-world "audit log before any moderation action"
  // scenario the audit finding was based on.
  @Schema({ collection: 'auth_predicate_admin_audit_log' })
  class AuthPredicateAdminAuditLogEntity extends BaseEntity {
    @Prop({ type: String })
    action?: string;
  }

  const registerAndLogin = async (email: string, role: string) => {
    await server.post('/auth/register', { email, password: 'password123', role });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
    const { body: account } = await server.get('/auth/account', { authToken: accessToken });

    return { accessToken, id: account.id as string };
  };

  const isAdminRole = (
    _entity: AuthPredicateAdminAuditLogEntity,
    user: { role: string },
  ) => user.role === 'admin';

  const adminOverviewRoute = (
    useAuthAbilityPredicate: boolean,
  ): CustomRouteConfig<AuthPredicateAdminAuditLogEntity> => ({
    path: 'admin-overview',
    method: 'GET',
    ...(useAuthAbilityPredicate
      ? { authAbilityPredicate: (user: { role: string }) => user.role === 'admin' }
      : { abilityPredicate: isAdminRole }),
    handler: async () => ({ ok: true }),
  });

  const setup = async (useAuthAbilityPredicate: boolean) => {
    await initApp(
      {
        entity: AuthPredicateAdminAuditLogEntity,
        controllerOptions: { path: 'auth-predicate-admin-audit-log' },
        customRoutes: [adminOverviewRoute(useAuthAbilityPredicate)],
      },
      {
        useAuth: {
          userEntity: AuthPredicateUserEntity,
          login: { loginField: 'email', passwordField: 'password', additionalFields: ['role'] },
          register: {
            additionalFields: [{ name: 'role', required: false }],
          },
        },
      },
    );
  };

  describe('abilityPredicate on a document-less route — the bug this option exists to fix', () => {
    beforeEach(() => setup(false));

    it('demonstrates the fail-open bug: a non-admin gets 200 because the backing collection is empty', async () => {
      const nonAdmin = await registerAndLogin('member@auth-predicate.co', 'user');

      const { status } = await server.get(
        '/auth-predicate-admin-audit-log/admin-overview',
        { authToken: nonAdmin.accessToken },
      );

      // Wrong, but this is exactly the pre-existing behavior: findManyDocumentsWithAbilityPredicate
      // finds zero documents in the empty collection, so isAdminRole is never actually evaluated —
      // the Guard vacuously returns true. This test locks in the failure mode being fixed, not the
      // desired outcome.
      expect(status).toBe(200);
    });
  });

  describe('authAbilityPredicate on the same document-less route — the fix', () => {
    beforeEach(() => setup(true));

    it('denies a non-admin, regardless of the backing collection being empty', async () => {
      const nonAdmin = await registerAndLogin('member2@auth-predicate.co', 'user');

      const { status } = await server.get(
        '/auth-predicate-admin-audit-log/admin-overview',
        { authToken: nonAdmin.accessToken },
      );

      expect(status).toBe(403);
    });

    it('allows an admin', async () => {
      const admin = await registerAndLogin('admin@auth-predicate.co', 'admin');

      const { status, body } = await server.get(
        '/auth-predicate-admin-audit-log/admin-overview',
        { authToken: admin.accessToken },
      );

      expect(status).toBe(200);
      expect(body).toEqual({ ok: true });
    });

    it('denies an unauthenticated request', async () => {
      const { status } = await server.get('/auth-predicate-admin-audit-log/admin-overview');

      expect(status).toBe(401);
    });
  });
});
