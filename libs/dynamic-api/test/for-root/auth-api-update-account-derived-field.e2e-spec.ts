import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, DerivedField, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initModule } from '../shared';

/**
 * E2E coverage for suggestion #10 — `useAuth`'s `PATCH /auth/account` persisted its update via a
 * raw `this.model.updateOne(...)` call, entirely bypassing `BaseService.updateOneDocument`'s
 * automatic `@DerivedField({ on: 'save' })` recompute. A derived field depending on a field the
 * user just updated through their own account settings stayed stale until some other write
 * touched the document.
 *
 * `updateAccount` now persists via `updateOneDocument`, which resolves the document's `_id`
 * (when the entity has any `@DerivedField`) and recomputes from its current, full state after
 * the write — matching every other out-of-native-pipeline write `CallbackMethods` covers.
 */
describe('DynamicApiModule forRoot - PATCH /auth/account recomputes @DerivedField (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'derived_account_users' })
  class DerivedAccountUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String })
    firstName?: string;

    @Prop({ type: String })
    lastName?: string;

    @Prop({ type: String })
    @DerivedField<DerivedAccountUserEntity>((e) => `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim())
    fullName?: string;
  }

  it('recomputes fullName after a PATCH /auth/account changes lastName', async () => {
    await initModule({
      useAuth: {
        userEntity: DerivedAccountUserEntity,
        login: { loginField: 'email', passwordField: 'password', additionalFields: ['fullName'] },
      },
    });

    const { body: registerBody } = await server.post('/auth/register', {
      email: 'derived-account@test.co',
      password: 'password123',
    });
    const accessToken = registerBody.accessToken as string;

    // First PATCH: sets firstName + lastName from scratch.
    const first = await server.patch(
      '/auth/account',
      { firstName: 'Jane', lastName: 'Doe' },
      { authToken: accessToken },
    );
    expect(first.status).toBe(200);
    expect(first.body.fullName).toBe('Jane Doe');

    // Second PATCH: only lastName changes — recompute must merge with the *current* firstName
    // (already persisted), not just the partial update, and must not leave fullName stale.
    const second = await server.patch(
      '/auth/account',
      { lastName: 'Smith' },
      { authToken: accessToken },
    );
    expect(second.status).toBe(200);
    expect(second.body.fullName).toBe('Jane Smith');
  });
});
