import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for audit finding F7 — `abilityPredicate` on a custom route only runs its
 * single-document check when the route's param is named `id`; a route like
 * `parental-consent/:userId` silently falls back to a list-based check instead, which doesn't
 * evaluate the predicate against the actual target at all. `targetParam` fixes this by telling
 * the Guard which param identifies the target document.
 *
 * Scenario mirrors the real bug: a family member should be able to grant "parental consent" for
 * someone else in their family, but never for themselves.
 */
describe('DynamicApiModule forFeature - custom route targetParam (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'target_param_users' })
  class TargetParamUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: Boolean, default: false })
    consented: boolean;
  }

  const registerAndLogin = async (email: string) => {
    await server.post('/auth/register', { email, password: 'password123' });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
    const { body: account } = await server.get('/auth/account', { authToken: accessToken });

    return { accessToken, id: account.id as string };
  };

  // Denies when the target IS the caller — a family member can consent for someone else, never
  // for themselves.
  const isNotSelf = (target: TargetParamUserEntity, user: { id: string }) => target.id !== user.id;

  const parentalConsentRoute = (
    targetParam?: string,
  ): CustomRouteConfig<TargetParamUserEntity> => ({
    path: 'parental-consent/:userId',
    method: 'PATCH',
    abilityPredicate: isNotSelf,
    ...(targetParam ? { targetParam } : {}),
    handler: async ({ model, params }) => model.findByIdAndUpdate(
      params.userId,
      { consented: true },
      { new: true },
    ),
  });

  describe('with targetParam set to the route\'s actual param', () => {
    beforeEach(async () => {
      await initApp(
        {
          entity: TargetParamUserEntity,
          controllerOptions: { path: 'target-param-users' },
          customRoutes: [parentalConsentRoute('userId')],
        },
        {
          useAuth: {
            userEntity: TargetParamUserEntity,
            login: { loginField: 'email', passwordField: 'password' },
          },
        },
      );
    });

    it('should deny a user granting parental consent to themselves', async () => {
      const minor = await registerAndLogin('minor@target-param.co');

      const { status } = await server.patch(
        `/target-param-users/parental-consent/${minor.id}`,
        {},
        { authToken: minor.accessToken },
      );

      expect(status).toBe(403);
    });

    it('should allow a user granting parental consent to someone else', async () => {
      const parent = await registerAndLogin('parent@target-param.co');
      const minor = await registerAndLogin('minor2@target-param.co');

      const { status } = await server.patch(
        `/target-param-users/parental-consent/${minor.id}`,
        {},
        { authToken: parent.accessToken },
      );

      expect(status).toBe(200);
    });
  });

  describe('without targetParam — the misconfiguration this option exists to fix', () => {
    beforeEach(async () => {
      await initApp(
        {
          entity: TargetParamUserEntity,
          controllerOptions: { path: 'target-param-users' },
          customRoutes: [parentalConsentRoute()],
        },
        {
          useAuth: {
            userEntity: TargetParamUserEntity,
            login: { loginField: 'email', passwordField: 'password' },
          },
        },
      );
    });

    it('demonstrates the misconfiguration this fix exists for: a legitimate request gets wrongly denied', async () => {
      // Without targetParam, the Guard never finds a param named "id" (the route uses :userId),
      // so it falls back to checking every document matching the (empty) query string — i.e.
      // every user in the collection, including the caller's own record — instead of checking
      // the actual :userId target at all. isNotSelf(callerOwnRecord, caller) is trivially false,
      // so this otherwise perfectly legitimate "parent grants consent to minor" request gets
      // denied for a reason that has nothing to do with the real target. This is exactly the
      // misconfiguration the boot-time warning (see create-custom-route-controller.ts) and
      // targetParam exist to catch/fix.
      const parent = await registerAndLogin('parent3@target-param.co');
      const minor = await registerAndLogin('minor3@target-param.co');

      const { status } = await server.patch(
        `/target-param-users/parental-consent/${minor.id}`,
        {},
        { authToken: parent.accessToken },
      );

      expect(status).toBe(403);
    });
  });
});
