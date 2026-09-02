import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import {
  allOf,
  anyOf,
  BaseEntity,
  DynamicApiModule,
  isAdmin,
  isGroupMember,
  isNotDeleted,
  isOwner,
  isPublic,
  SoftDeletableEntity,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from '../utils';
import { initApp } from '../shared';

/**
 * E2E coverage for the standard predicate factories (isOwner, isAdmin, isGroupMember,
 * isNotDeleted, isPublic, allOf/anyOf) driven through the real guard pipeline.
 */
describe('DynamicApiModule forFeature - Standard Ability Predicates (e2e)', () => {

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  @Schema({ collection: 'pred_users' })
  class PredUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: 'user' })
    role: string;

    @Prop({ type: String })
    groupId?: string;
  }

  @Schema({ collection: 'pred_articles' })
  class PredArticleEntity extends SoftDeletableEntity {
    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String })
    ownerId?: string;

    @Prop({ type: Boolean, default: false })
    isPublic: boolean;

    @Prop({ type: String })
    groupId?: string;
  }

  @Schema({ collection: 'pred_group_items' })
  class PredGroupItemEntity extends SoftDeletableEntity {
    @Prop({ type: String, required: true })
    label: string;

    @Prop({ type: String })
    groupId?: string;
  }

  @Schema({ collection: 'pred_self_ref_items' })
  class PredSelfRefItemEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    label: string;
  }

  const registerAndLogin = async (email: string, role: string, groupId: string) => {
    await server.post('/auth/register', { email, password: 'password123', role, groupId });
    const { body: { accessToken } } = await server.post('/auth/login', { email, password: 'password123' });
    const { body: account } = await server.get('/auth/account', { authToken: accessToken });

    return { accessToken, id: account.id as string };
  };

  beforeEach(async () => {
    await initApp(
      {
        entity: PredArticleEntity,
        controllerOptions: { path: 'pred-articles' },
        routes: [
          { type: 'GetOne', abilityPredicate: isOwner() },
          { type: 'UpdateOne', abilityPredicate: isOwner() },
          { type: 'DeleteOne', abilityPredicate: isAdmin({ roleField: 'role' }) },
          {
            type: 'GetMany',
            predicateBehavior: 'filter',
            abilityPredicate: anyOf(isPublic(), isOwner()),
          },
        ],
        extraImports: [
          DynamicApiModule.forFeature({
            entity: PredGroupItemEntity,
            controllerOptions: { path: 'pred-group-items' },
            routes: [
              { type: 'GetOne', abilityPredicate: allOf(isNotDeleted(), isGroupMember()) },
            ],
          }),
          DynamicApiModule.forFeature({
            entity: PredSelfRefItemEntity,
            controllerOptions: { path: 'pred-self-ref-items' },
            routes: [
              // Compares the item's real Mongo `_id` (ObjectId) against `user.groupId` (string) —
              // reproduces the default ObjectId-vs-string coercion, no `compare` override needed.
              { type: 'GetOne', abilityPredicate: isOwner({ entityField: '_id', userField: 'groupId' }) },
            ],
          }),
        ],
      },
      {
        useAuth: {
          userEntity: PredUserEntity,
          login: { loginField: 'email', passwordField: 'password', additionalFields: ['role', 'groupId'] },
          register: {
            additionalFields: [
              { name: 'role', required: false },
              { name: 'groupId', required: false },
            ],
          },
        },
      },
    );
  });

  describe('isOwner — GetOne / UpdateOne (throw mode)', () => {
    it('should allow the owner to fetch and update their article, and deny another user', async () => {
      const owner = await registerAndLogin('owner@pred.co', 'user', 'g1');
      const other = await registerAndLogin('other@pred.co', 'user', 'g2');

      const model = await getModelFromEntity(PredArticleEntity);
      const [article] = await model.insertMany([{ title: 'owned', ownerId: owner.id, groupId: 'g1' }]);

      const ownerGet = await server.get(`/pred-articles/${article.id}`, { authToken: owner.accessToken });
      const otherGet = await server.get(`/pred-articles/${article.id}`, { authToken: other.accessToken });

      expect(ownerGet.status).toBe(200);
      expect(otherGet.status).toBe(403);

      const ownerUpdate = await server.patch(
        `/pred-articles/${article.id}`,
        { title: 'updated by owner' },
        { authToken: owner.accessToken },
      );
      const otherUpdate = await server.patch(
        `/pred-articles/${article.id}`,
        { title: 'updated by other' },
        { authToken: other.accessToken },
      );

      expect(ownerUpdate.status).toBe(200);
      expect(otherUpdate.status).toBe(403);
    });
  });

  describe('isAdmin — DeleteOne (role mode)', () => {
    it('should allow an admin role to delete and deny a non-admin owner', async () => {
      const owner = await registerAndLogin('owner2@pred.co', 'user', 'g1');
      const admin = await registerAndLogin('admin@pred.co', 'admin', 'g1');

      const model = await getModelFromEntity(PredArticleEntity);
      const [ownerArticle, adminArticle] = await model.insertMany([
        { title: 'article-a', ownerId: owner.id, groupId: 'g1' },
        { title: 'article-b', ownerId: owner.id, groupId: 'g1' },
      ]);

      const deniedDelete = await server.delete(`/pred-articles/${ownerArticle.id}`, { authToken: owner.accessToken });
      const allowedDelete = await server.delete(`/pred-articles/${adminArticle.id}`, { authToken: admin.accessToken });

      expect(deniedDelete.status).toBe(403);
      expect(allowedDelete.status).toBe(200);
    });
  });

  describe('anyOf(isPublic(), isOwner()) — GetMany (filter mode)', () => {
    it('should return public and owned articles, excluding private articles owned by someone else', async () => {
      const owner = await registerAndLogin('owner3@pred.co', 'user', 'g1');
      const other = await registerAndLogin('other3@pred.co', 'user', 'g2');

      const model = await getModelFromEntity(PredArticleEntity);
      await model.insertMany([
        { title: 'mine-private', ownerId: owner.id, isPublic: false, groupId: 'g1' },
        { title: 'someone-public', ownerId: other.id, isPublic: true, groupId: 'g2' },
        { title: 'someone-private', ownerId: other.id, isPublic: false, groupId: 'g2' },
      ]);

      const { status, body } = await server.get('/pred-articles', { authToken: owner.accessToken });

      expect(status).toBe(200);
      const titles = (body as { title: string }[]).map((a) => a.title).sort();
      expect(titles).toEqual(['mine-private', 'someone-public']);
    });
  });

  describe('allOf(isNotDeleted(), isGroupMember()) — GetOne', () => {
    it('should allow access only to non-deleted items in the same group', async () => {
      const member = await registerAndLogin('member@pred.co', 'user', 'g1');

      const model = await getModelFromEntity(PredGroupItemEntity);
      const [sameGroupActive, sameGroupDeleted, otherGroupActive] = await model.insertMany([
        { label: 'active-same-group', groupId: 'g1', isDeleted: false },
        { label: 'deleted-same-group', groupId: 'g1', isDeleted: true },
        { label: 'active-other-group', groupId: 'g2', isDeleted: false },
      ]);

      const allowed = await server.get(`/pred-group-items/${sameGroupActive.id}`, { authToken: member.accessToken });
      const deniedDeleted = await server.get(
        `/pred-group-items/${sameGroupDeleted.id}`,
        { authToken: member.accessToken },
      );
      const deniedOtherGroup = await server.get(
        `/pred-group-items/${otherGroupActive.id}`,
        { authToken: member.accessToken },
      );

      expect(allowed.status).toBe(200);
      expect(deniedDeleted.status).toBe(403);
      expect(deniedOtherGroup.status).toBe(403);
    });
  });

  describe('isOwner — default ObjectId-vs-string coercion (entityField: "_id")', () => {
    it('should allow access when the entity ObjectId matches its string form on the user, and deny a mismatch', async () => {
      const model = await getModelFromEntity(PredSelfRefItemEntity);
      const [item] = await model.insertMany([{ label: 'self-ref-item' }]);

      const matching = await registerAndLogin('matching@pred.co', 'user', item.id.toString());
      const mismatched = await registerAndLogin('mismatched@pred.co', 'user', 'not-this-items-id');

      const allowed = await server.get(`/pred-self-ref-items/${item.id}`, { authToken: matching.accessToken });
      const denied = await server.get(`/pred-self-ref-items/${item.id}`, { authToken: mismatched.accessToken });

      expect(allowed.status).toBe(200);
      expect(denied.status).toBe(403);
    });
  });
});
