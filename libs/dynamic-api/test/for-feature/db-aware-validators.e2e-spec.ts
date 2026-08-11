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
  @IsUnique(MemberEntity, { caseInsensitive: true })
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
        routes: [{ type: 'CreateOne' }],
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
        await memberModel.insertMany([{ email: 'existing@test.com', familyId: activeFamilyId }]);
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
  });
});
