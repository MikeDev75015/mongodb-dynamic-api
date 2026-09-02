import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Injectable } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseEntity, CustomRouteConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { initApp } from '../shared';

/**
 * E2E coverage for audit finding F8 — a custom route handler only ever received
 * `{ model, user, params, body, query, req }`, with no way to reach an application service (a
 * mailer, in the audited real-world case). `inject` fixes this: a custom route can now list
 * provider tokens to resolve via `ModuleRef` and receive them as the handler's second argument,
 * without having to bail out of `customRoutes` into a hand-written Nest controller.
 */
describe('DynamicApiModule forFeature - custom route inject (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Injectable()
  class MailService {
    sentCount = 0;

    send(to: string): { to: string; sent: true } {
      this.sentCount += 1;
      return { to, sent: true };
    }
  }

  @Schema({ collection: 'invite_families' })
  class InviteFamilyEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    name: string;
  }

  const inviteMemberRoute: CustomRouteConfig<InviteFamilyEntity> = {
    path: 'invite-member',
    method: 'POST',
    inject: [MailService],
    handler: async (ctx, [mailService]) => {
      const mail = mailService as MailService;
      const body = ctx.body as { email: string };
      return mail.send(body.email);
    },
  };

  it('should resolve the injected provider and let the handler use it', async () => {
    await initApp(
      {
        entity: InviteFamilyEntity,
        controllerOptions: { path: 'invite-families', isPublic: true },
        // At least one standard route is required for extraProviders to be wired into the
        // compiled module graph at all — customRoutes alone never consume it.
        routes: [{ type: 'GetOne', isPublic: true }],
        customRoutes: [inviteMemberRoute],
        extraProviders: [MailService],
      },
    );

    const { status, body } = await server.post('/invite-families/invite-member', {
      email: 'new-member@family.test',
    });

    expect(status).toBe(201);
    expect(body).toEqual({ to: 'new-member@family.test', sent: true });
  });

  it('should reuse the same Nest-managed singleton instance across requests', async () => {
    await initApp(
      {
        entity: InviteFamilyEntity,
        controllerOptions: { path: 'invite-families', isPublic: true },
        routes: [{ type: 'GetOne', isPublic: true }],
        customRoutes: [inviteMemberRoute],
        extraProviders: [MailService],
      },
    );

    await server.post('/invite-families/invite-member', { email: 'first@family.test' });
    await server.post('/invite-families/invite-member', { email: 'second@family.test' });

    // Only observable via a fresh handler call: resolve the same token again and check the
    // counter carried over — proves it's the one singleton Nest manages, not a new instance
    // constructed per request.
    const thirdRoute: CustomRouteConfig<InviteFamilyEntity> = {
      path: 'invite-count',
      method: 'GET',
      inject: [MailService],
      handler: async (_ctx, [mailService]) => ({ sentCount: (mailService as MailService).sentCount }),
    };

    // Re-init with the extra read route added, same MailService provider — Nest still resolves
    // to a fresh singleton for this fresh app, so seed it with the same two sends first.
    await closeTestingApp(mongoose.connections);
    await initApp(
      {
        entity: InviteFamilyEntity,
        controllerOptions: { path: 'invite-families', isPublic: true },
        routes: [{ type: 'GetOne', isPublic: true }],
        customRoutes: [inviteMemberRoute, thirdRoute],
        extraProviders: [MailService],
      },
    );

    await server.post('/invite-families/invite-member', { email: 'a@family.test' });
    await server.post('/invite-families/invite-member', { email: 'b@family.test' });
    const { body } = await server.get('/invite-families/invite-count');

    expect(body).toEqual({ sentCount: 2 });
  });
});
