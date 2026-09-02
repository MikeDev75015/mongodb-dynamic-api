import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import {
  BaseEntity,
  DynamicApiModule,
  EntityExists,
  IsUnique,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import { initApp } from '../shared';
import { getModelFromEntity } from '../utils';
import 'dotenv/config';

// ── Entity declarations ─────────────────────────────────────────────────────

@Schema({ collection: 'e2e-validator-families' })
class FamilyEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

@Schema({ collection: 'e2e-validator-members' })
class MemberEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  @IsUnique(MemberEntity, { caseInsensitive: true, ignoreId: 'id' })
  email: string;

  @Prop({ type: String, required: true })
  @EntityExists(FamilyEntity, { filter: () => ({ isActive: true }) })
  familyId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type SupertestResponse = { status: number; body: Record<string, unknown> };

describe('DynamicApiModule forFeature - IsUnique & EntityExists validators (e2e)', () => {
  let activeFamilyId: string;
  let inactiveFamilyId: string;
  let memberId: string;
  let otherMemberId: string;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  beforeEach(async () => {
    await initApp(
      {
        entity: MemberEntity,
        controllerOptions: {
          path: 'members',
          validationPipeOptions: { whitelist: true, transform: true },
        },
        routes: [{ type: 'CreateOne' }, { type: 'UpdateOne' }],
        extraImports: [
          DynamicApiModule.forFeature({ entity: FamilyEntity, controllerOptions: { path: 'families' }, routes: [] }),
        ],
      },
      {},
      async (_: Connection) => {
        const familyModel = await getModelFromEntity(FamilyEntity);
        const [activeFamily] = await familyModel.insertMany([{ name: 'Active Family', isActive: true }]);
        const [inactiveFamily] = await familyModel.insertMany([{ name: 'Inactive Family', isActive: false }]);
        activeFamilyId = activeFamily._id.toString();
        inactiveFamilyId = inactiveFamily._id.toString();

        const memberModel = await getModelFromEntity(MemberEntity);
        const [member, otherMember] = await memberModel.insertMany([
          { email: 'existing@test.com', familyId: activeFamilyId },
          { email: 'other@test.com', familyId: activeFamilyId },
        ]);
        memberId = member.id.toString();
        otherMemberId = otherMember.id.toString();
      },
    );
  });

  describe('POST /members', () => {
    it('should create the member when email is unique and family is active', async () => {
      const { status, body } = await server.post('/members', {
        email: 'new@test.com',
        familyId: activeFamilyId,
      }) as SupertestResponse;

      expect(status).toBe(201);
      expect(body).toMatchObject({ email: 'new@test.com', familyId: activeFamilyId });
    });

    it('should reject an exact duplicate email with 400', async () => {
      const { status, body } = await server.post('/members', {
        email: 'existing@test.com',
        familyId: activeFamilyId,
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email must be unique')]),
      );
    });

    it('should reject a case-different duplicate email with 400 (caseInsensitive)', async () => {
      const { status, body } = await server.post('/members', {
        email: 'EXISTING@TEST.COM',
        familyId: activeFamilyId,
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email must be unique')]),
      );
    });

    it('should reject a non-existent familyId with 400', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const { status, body } = await server.post('/members', {
        email: 'another@test.com',
        familyId: nonExistentId,
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Referenced FamilyEntity does not exist')]),
      );
    });

    it('should reject a familyId that exists but is filtered out (isActive: false) with 400', async () => {
      const { status, body } = await server.post('/members', {
        email: 'yet-another@test.com',
        familyId: inactiveFamilyId,
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Referenced FamilyEntity does not exist')]),
      );
    });

    it('should reject a malformed familyId with a clean 400 instead of a 500 (Mongoose CastError)', async () => {
      const { status, body } = await server.post('/members', {
        email: 'malformed-ref@test.com',
        familyId: 'not-a-valid-object-id',
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Referenced FamilyEntity does not exist')]),
      );
    });
  });

  describe('PATCH /members/:id — @IsUnique ignoreId sourced from the URL, not the body', () => {
    it('should allow a self-update that keeps the same email (self-exclusion via ignoreId)', async () => {
      const { status, body } = await server.patch(`/members/${memberId}`, {
        email: 'existing@test.com',
      }) as SupertestResponse;

      expect(status).toBe(200);
      expect(body).toMatchObject({ email: 'existing@test.com' });
    });

    it('should still reject renaming to another member\'s email with 400', async () => {
      const { status, body } = await server.patch(`/members/${memberId}`, {
        email: 'other@test.com',
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email must be unique')]),
      );
    });

    it('should allow renaming to a genuinely unused email', async () => {
      const { status, body } = await server.patch(`/members/${memberId}`, {
        email: 'brand-new@test.com',
      }) as SupertestResponse;

      expect(status).toBe(200);
      expect(body).toMatchObject({ email: 'brand-new@test.com' });
    });

    it('should still reject an empty body with 400 (id injection must not fake a non-empty body)', async () => {
      const { status, body } = await server.patch(`/members/${memberId}`, {}) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toContain('Invalid request body');
    });

    it('should ignore a client-supplied id in the body and use the URL id instead', async () => {
      // Spoofing another member's id in the body must not let this update escape ITS OWN
      // self-exclusion — the email is still checked against the URL member (memberId), so
      // renaming to otherMember's email must still be rejected.
      const { status, body } = await server.patch(`/members/${memberId}`, {
        id: otherMemberId,
        email: 'other@test.com',
      }) as SupertestResponse;

      expect(status).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email must be unique')]),
      );
    });
  });
});
