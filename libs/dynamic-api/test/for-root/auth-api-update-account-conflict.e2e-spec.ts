import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { Connection } from 'mongoose';
import { DynamicApiModule } from '../../src';
import { BcryptService } from '../../src/services/bcrypt/bcrypt.service';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { createUniqueEmailUserEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - PATCH /auth/account on a unique index (e2e)', () => {
  const User = createUniqueEmailUserEntity();
  type User = InstanceType<typeof User>;

  const alice = { email: 'alice@test.co', password: 'alice-password', name: 'Alice' };
  const bob = { email: 'bob@test.co', password: 'bob-password', name: 'Bob' };

  let model: mongoose.Model<User>;

  const fixtures = async (_: Connection) => {
    const bcryptService = new BcryptService();
    model = await getModelFromEntity(User);
    // The collection is dropped by createTestingApp: rebuild the unique index declared on `email`.
    await model.syncIndexes();
    await model.insertMany([
      { ...alice, password: await bcryptService.hashPassword(alice.password) },
      { ...bob, password: await bcryptService.hashPassword(bob.password) },
    ]);
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  beforeEach(async () => {
    await initModule({
      useAuth: {
        userEntity: User,
        // The login field is excluded from the update body by default: allow it here so the test
        // can try to take another account's email.
        updateAccount: {
          beforeSaveCallback: async (_entity, { update }) => update as Partial<User>,
        },
        validationPipeOptions: { whitelist: false },
      },
    }, fixtures);
  });

  it('should return 409 (not 500) when the update hits the unique index', async () => {
    const { body: { accessToken } } = await server.post('/auth/login', { email: alice.email, password: alice.password });

    const { body, status } = await server.patch('/auth/account', { email: bob.email }, { authToken: accessToken });

    expect(status).toBe(409);
    expect(body).toEqual({
      error: 'Conflict',
      message: `email '${bob.email}' is already used`,
      statusCode: 409,
    });

    const { email } = await model.findOne({ name: alice.name }).lean().exec();
    expect(email).toBe(alice.email);
  });

  it('should still update a non-conflicting value', async () => {
    const { body: { accessToken } } = await server.post('/auth/login', { email: alice.email, password: alice.password });

    const { body, status } = await server.patch('/auth/account', { name: 'Alice Smith' }, { authToken: accessToken });

    expect(status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ email: alice.email }));
    const { name } = await model.findOne({ email: alice.email }).lean().exec();
    expect(name).toBe('Alice Smith');
  });
});
