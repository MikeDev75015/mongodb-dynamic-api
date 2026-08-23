/**
 * Regression coverage for @Exclude() / @Exclude({ toPlainOnly: true }) being honored on the
 * response of every route built through BaseService.buildInstance() (GetOne, GetMany, CreateOne,
 * UpdateOne, ...) — the library's own documented pattern for hiding a password hash from
 * responses (see README/authentication.md's Complete Authentication Setup example).
 *
 * Added while investigating audit finding F6 ("plainToInstance ignores @Exclude({toPlainOnly:
 * true}) on read"). That finding does not reproduce: buildInstance() does only run documents
 * through plainToInstance() (the plain → instance direction, where @Exclude({toPlainOnly:true})
 * has no effect), but every generated controller/gateway already applies
 * `@UseInterceptors(ClassSerializerInterceptor, ...)` at the class level (see e.g.
 * routes/get-one/get-one.helper.ts) — present since the library's very first commit — which runs
 * the response back through instanceToPlain()/classToPlain() and correctly strips the field. No
 * source change was needed; this test locks the behavior in and documents that it already works,
 * since nothing previously exercised it end-to-end.
 */

import { Prop, Schema } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import mongoose from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

describe('DynamicApiModule forFeature - @Exclude honored on responses (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'exclude_accounts' })
  class ExcludeAccountEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    username: string;

    // Mirrors README/authentication.md's documented password-hiding pattern.
    @Exclude({ toPlainOnly: true })
    @Prop({ type: String, required: true })
    passwordHash: string;
  }

  beforeEach(async () => {
    await initApp({
      entity: ExcludeAccountEntity,
      controllerOptions: { path: 'exclude-accounts', isPublic: true },
      routes: [
        { type: 'GetOne' },
        { type: 'GetMany' },
        { type: 'CreateOne' },
        { type: 'UpdateOne' },
      ],
    });
  });

  it('should never return passwordHash from GetOne', async () => {
    const model = await getModelFromEntity(ExcludeAccountEntity);
    const [account] = await model.insertMany([{ username: 'alice', passwordHash: 'super-secret-hash' }]);

    const { status, body } = await server.get(`/exclude-accounts/${account.id}`);

    expect(status).toBe(200);
    expect(body.username).toBe('alice');
    expect(body.passwordHash).toBeUndefined();
  });

  it('should never return passwordHash from GetMany', async () => {
    const model = await getModelFromEntity(ExcludeAccountEntity);
    await model.insertMany([
      { username: 'alice', passwordHash: 'alice-hash' },
      { username: 'bob', passwordHash: 'bob-hash' },
    ]);

    const { status, body } = await server.get('/exclude-accounts');

    expect(status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body.every((a: { passwordHash?: string }) => a.passwordHash === undefined)).toBe(true);
  });

  it('should never return passwordHash from CreateOne', async () => {
    const { status, body } = await server.post('/exclude-accounts', {
      username: 'carol',
      passwordHash: 'carol-hash',
    });

    expect(status).toBe(201);
    expect(body.username).toBe('carol');
    expect(body.passwordHash).toBeUndefined();
  });

  it('should never return passwordHash from UpdateOne', async () => {
    const model = await getModelFromEntity(ExcludeAccountEntity);
    const [account] = await model.insertMany([{ username: 'dave', passwordHash: 'dave-hash' }]);

    const { status, body } = await server.patch(`/exclude-accounts/${account.id}`, {
      passwordHash: 'dave-hash-rotated',
    });

    expect(status).toBe(200);
    expect(body.passwordHash).toBeUndefined();

    // The write itself must still go through untouched — @Exclude({ toPlainOnly: true }) only
    // hides the field from the response, it doesn't stop it from being persisted.
    const updated = await model.findById(account.id).lean();
    expect(updated?.passwordHash).toBe('dave-hash-rotated');
  });
});
