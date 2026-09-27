import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import type { Request } from 'express';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule, enableDynamicAPIValidation } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initModule } from '../shared';

@Schema({ collection: 'users' })
class StrictBodyUser extends BaseEntity {
  @Prop({ type: String, required: true })
  @IsEmail()
  email: string;

  // Hidden from responses, never from requests.
  @Prop({ type: String, required: true })
  @IsString()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Prop({ type: String })
  deviceToken?: string;

  @Prop({ type: Boolean })
  acceptedTerms?: boolean;
}

type RegisterExtra = { familyId?: string };
type LoginBody = { email?: string; deviceToken?: string };

describe('DynamicApiModule forRoot - auth bodies under the default strict body pipe (e2e)', () => {
  let app: INestApplication;
  let model: mongoose.Model<StrictBodyUser>;
  let lastDeviceToken: string | undefined;
  let lastFamilyId: string | undefined;

  beforeEach(async () => {
    DynamicApiModule.state['resetState']();
    lastDeviceToken = undefined;
    lastFamilyId = undefined;

    app = await initModule(
      {
        useAuth: {
          userEntity: StrictBodyUser,
          login: {
            additionalBodyFields: ['deviceToken'],
            // Reads a body field that is not a credential, like a device-token login flow.
            customValidate: async (req: Request) => {
              lastDeviceToken = (req.body as LoginBody).deviceToken;
              return null;
            },
          },
          register: {
            additionalFields: [
              { name: 'acceptedTerms', required: true },
              { name: 'familyId' as keyof StrictBodyUser, required: false },
            ],
            beforeSaveCallback: async (user: StrictBodyUser & RegisterExtra) => {
              lastFamilyId = user.familyId;
              const { familyId, ...toSave } = user;
              return toSave as StrictBodyUser;
            },
          },
        },
      },
      undefined,
      async (_: INestApplication) => {
        enableDynamicAPIValidation(_);
      },
    );
    model = await getModelFromEntity(StrictBodyUser);
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  it('should register with an @Exclude({ toPlainOnly }) password and extra fields', async () => {
    const { status, body } = await server.post('/auth/register', {
      email: 'strict@test.co', password: 'Passw0rd!x', acceptedTerms: true, familyId: 'family-1',
    });

    expect(status).toBe(201);
    expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    expect(lastFamilyId).toBe('family-1');
    const stored = await model.findOne({ email: 'strict@test.co' }).lean().exec();
    expect(stored.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    expect(stored.acceptedTerms).toBe(true);
  });

  it('should log in with customValidate and an additional body field', async () => {
    await server.post('/auth/register', { email: 'strict@test.co', password: 'Passw0rd!x', acceptedTerms: true });

    const { status, body } = await server.post('/auth/login', {
      email: 'strict@test.co', password: 'Passw0rd!x', deviceToken: 'dev-1',
    });

    expect(status).toBe(200);
    expect(body).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    expect(lastDeviceToken).toBe('dev-1');
  });

  it.each([
    ['/auth/register', { email: 'strict@test.co', password: 'Passw0rd!x', acceptedTerms: true, role: 'admin' }],
    ['/auth/login', { email: 'strict@test.co', password: 'Passw0rd!x', role: 'admin' }],
  ])('should still reject an undeclared field on %s', async (path, payload) => {
    await server.post('/auth/register', { email: 'strict@test.co', password: 'Passw0rd!x', acceptedTerms: true });

    const { status, body } = await server.post(path, payload);

    expect(status).toBe(400);
    expect(body.message).toEqual(['property role should not exist']);
  });
});
