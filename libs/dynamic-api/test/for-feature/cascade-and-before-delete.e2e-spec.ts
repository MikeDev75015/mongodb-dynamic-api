import { BadRequestException } from '@nestjs/common';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import {
  BaseEntity,
  BeforeDeleteCallback,
  BeforeDeleteManyCallback,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  CascadeConfig,
  DynamicApiModule,
  SoftDeletableEntity,
} from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import { initApp } from '../shared';
import { getModelFromEntity } from '../utils';
import 'dotenv/config';

// ── Entity declarations ─────────────────────────────────────────────────────

@Schema({ collection: 'e2e-posts' })
class PostEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;
}

@Schema({ collection: 'e2e-soft-posts' })
class SoftPostEntity extends SoftDeletableEntity {
  @Prop({ type: String, required: true })
  title: string;
}

@Schema({ collection: 'e2e-comments' })
class CommentEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: String, required: true })
  body: string;
}

@Schema({ collection: 'e2e-soft-comments' })
class SoftCommentEntity extends SoftDeletableEntity {
  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: String, required: true })
  body: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type SupertestResponse = { status: number; body: Record<string, unknown> };

describe('DynamicApiModule forFeature - cascade & beforeDeleteCallback (e2e)', () => {
  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  // =========================================================================
  // 1. beforeDeleteCallback — throws → HTTP 4xx, document NOT deleted
  // =========================================================================
  describe('beforeDeleteCallback on DeleteOne — throws => HTTP 4xx, parent preserved', () => {
    let postId: string;

    const blockingBeforeDelete: BeforeDeleteCallback<PostEntity, BeforeSaveDeleteContext> =
      async (_entity, _context, _methods) => {
        throw new BadRequestException('deletion blocked by beforeDeleteCallback');
      };

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'posts' },
          routes: [
            { type: 'CreateOne' },
            { type: 'GetMany' },
            { type: 'DeleteOne', beforeDeleteCallback: blockingBeforeDelete },
          ],
        },
        {},
        async (_: Connection) => {
          const model = await getModelFromEntity(PostEntity);
          const [inserted] = await model.insertMany([{ title: 'post-1' }]);
          postId = inserted._id.toString();
        },
      );
    });

    it('should return 400 and leave the document in the database', async () => {
      const { status } = await server.delete(`/posts/${postId}`) as SupertestResponse;

      expect(status).toBe(400);

      // Document must still exist
      const { body, status: getStatus } = await server.get('/posts') as SupertestResponse;
      expect(getStatus).toBe(200);
      expect(body).toHaveLength(1);
    });
  });

  // =========================================================================
  // 2. beforeDeleteCallback on DeleteMany — throws => HTTP 4xx
  // =========================================================================
  describe('beforeDeleteCallback on DeleteMany — throws => HTTP 4xx, parents preserved', () => {
    let ids: string[];

    const blockingBeforeDeleteMany: BeforeDeleteManyCallback<PostEntity, BeforeSaveDeleteManyContext> =
      async (_entities, _context, _methods) => {
        throw new BadRequestException('bulk deletion blocked');
      };

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'posts' },
          routes: [
            { type: 'CreateOne' },
            { type: 'GetMany' },
            { type: 'DeleteMany', beforeDeleteCallback: blockingBeforeDeleteMany },
          ],
        },
        {},
        async (_: Connection) => {
          const model = await getModelFromEntity(PostEntity);
          const docs = await model.insertMany([{ title: 'a' }, { title: 'b' }]);
          ids = docs.map((d) => d._id.toString());
        },
      );
    });

    it('should return 400 and leave all documents in the database', async () => {
      const { status } = await server.delete('/posts', { query: { ids } }) as SupertestResponse;

      expect(status).toBe(400);

      const { body } = await server.get('/posts') as SupertestResponse;
      expect(body).toHaveLength(2);
    });
  });

  // =========================================================================
  // 3. beforeSaveCallback fix — throws => HTTP 4xx (regression verification)
  // =========================================================================
  describe('beforeSaveCallback on DeleteOne — throws => HTTP 4xx (fix: no longer swallowed)', () => {
    let postId: string;

    const blockingBeforeSave: BeforeSaveDeleteCallback<PostEntity, BeforeSaveDeleteContext> =
      async (_entity, _context, _methods) => {
        throw new BadRequestException('blocked by beforeSaveCallback');
      };

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'posts' },
          routes: [
            { type: 'GetMany' },
            { type: 'DeleteOne', beforeSaveCallback: blockingBeforeSave },
          ],
        },
        {},
        async (_: Connection) => {
          const model = await getModelFromEntity(PostEntity);
          const [inserted] = await model.insertMany([{ title: 'to-survive' }]);
          postId = inserted._id.toString();
        },
      );
    });

    it('should return 400 and not delete the document', async () => {
      const { status } = await server.delete(`/posts/${postId}`) as SupertestResponse;

      expect(status).toBe(400);

      const { body } = await server.get('/posts') as SupertestResponse;
      expect(body).toHaveLength(1);
    });
  });

  // =========================================================================
  // 4. Cascade — DeleteOne hard-deletes children (on: 'delete')
  // =========================================================================
  describe('cascade on DeleteOne — hard-deletes child documents', () => {
    let postId: string;
    const cascade: CascadeConfig[] = [
      { entity: CommentEntity, foreignKey: 'postId', on: 'delete' },
    ];

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'posts' },
          routes: [
            { type: 'GetMany' },
            { type: 'DeleteOne', cascade },
          ],
          extraImports: [
            DynamicApiModule.forFeature({ entity: CommentEntity, controllerOptions: { path: 'comments' }, routes: [] }),
          ],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(PostEntity);
          const commentModel = await getModelFromEntity(CommentEntity);
          const [post] = await postModel.insertMany([{ title: 'parent' }]);
          postId = post._id.toString();
          await commentModel.insertMany([
            { postId, body: 'comment-1' },
            { postId, body: 'comment-2' },
          ]);
        },
      );
    });

    it('should delete the post and cascade-delete its comments', async () => {
      const { status, body } = await server.delete(`/posts/${postId}`) as SupertestResponse;

      expect(status).toBe(200);
      expect(body).toMatchObject({ deletedCount: 1 });

      // Verify comments are deleted
      const commentModel = await getModelFromEntity(CommentEntity);
      const remaining = await commentModel.find({ postId }).lean().exec();
      expect(remaining).toHaveLength(0);
    });

    it('should NOT cascade if the parent was not found (deletedCount = 0)', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const { status } = await server.delete(`/posts/${nonExistentId}`) as SupertestResponse;

      expect(status).toBe(200);

      // Comments for original post still exist
      const commentModel = await getModelFromEntity(CommentEntity);
      const remaining = await commentModel.find({ postId }).lean().exec();
      expect(remaining).toHaveLength(2);
    });
  });

  // =========================================================================
  // 5. Cascade — DeleteMany hard-deletes children (on: 'delete')
  // =========================================================================
  describe('cascade on DeleteMany — hard-deletes children for all parents', () => {
    let postIds: string[];
    const cascade: CascadeConfig[] = [
      { entity: CommentEntity, foreignKey: 'postId', on: 'delete' },
    ];

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'posts' },
          routes: [
            { type: 'GetMany' },
            { type: 'DeleteMany', cascade },
          ],
          extraImports: [
            DynamicApiModule.forFeature({ entity: CommentEntity, controllerOptions: { path: 'comments' }, routes: [] }),
          ],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(PostEntity);
          const commentModel = await getModelFromEntity(CommentEntity);
          const posts = await postModel.insertMany([{ title: 'p1' }, { title: 'p2' }]);
          postIds = posts.map((p) => p._id.toString());
          await commentModel.insertMany([
            { postId: postIds[0], body: 'c1' },
            { postId: postIds[0], body: 'c2' },
            { postId: postIds[1], body: 'c3' },
          ]);
        },
      );
    });

    it('should delete all posts and cascade-delete their comments', async () => {
      const { status, body } = await server.delete('/posts', { query: { ids: postIds } }) as SupertestResponse;

      expect(status).toBe(200);
      expect(body).toMatchObject({ deletedCount: 2 });

      const commentModel = await getModelFromEntity(CommentEntity);
      const remaining = await commentModel.find({ postId: { $in: postIds } }).lean().exec();
      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. Cascade — DeleteOne soft-deletes children (on: 'softDelete')
  // =========================================================================
  describe('cascade on DeleteOne soft-deletable — soft-deletes child documents', () => {
    let postId: string;
    const cascade: CascadeConfig[] = [
      { entity: SoftCommentEntity, foreignKey: 'postId', on: 'softDelete' },
    ];

    beforeEach(async () => {
      await initApp(
        {
          entity: SoftPostEntity,
          controllerOptions: { path: 'soft-posts' },
          routes: [
            { type: 'GetMany' },
            { type: 'DeleteOne', cascade },
          ],
          extraImports: [
            DynamicApiModule.forFeature({ entity: SoftCommentEntity, controllerOptions: { path: 'soft-comments' }, routes: [] }),
          ],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(SoftPostEntity);
          const commentModel = await getModelFromEntity(SoftCommentEntity);
          const [post] = await postModel.insertMany([{ title: 'soft-parent' }]);
          postId = post._id.toString();
          await commentModel.insertMany([
            { postId, body: 'sc1' },
            { postId, body: 'sc2' },
          ]);
        },
      );
    });

    it('should soft-delete the post and soft-delete its comments via cascade', async () => {
      const { status, body } = await server.delete(`/soft-posts/${postId}`) as SupertestResponse;

      expect(status).toBe(200);
      expect(body).toMatchObject({ deletedCount: 1 });

      // Comments should be soft-deleted (isDeleted: true)
      const commentModel = await getModelFromEntity(SoftCommentEntity);
      const remaining = await commentModel.find({ postId, isDeleted: false }).lean().exec();
      expect(remaining).toHaveLength(0);

      const softDeleted = await commentModel.find({ postId, isDeleted: true }).lean().exec();
      expect(softDeleted).toHaveLength(2);
    });
  });

  // =========================================================================
  // 7. Cascade on hard-delete NOT triggered for soft-delete parent
  // =========================================================================
  describe('cascade on: delete NOT triggered when parent is soft-deletable', () => {
    let postId: string;
    const cascade: CascadeConfig[] = [
      { entity: CommentEntity, foreignKey: 'postId', on: 'delete' }, // 'delete' only
    ];

    beforeEach(async () => {
      await initApp(
        {
          entity: SoftPostEntity,
          controllerOptions: { path: 'soft-posts' },
          routes: [
            { type: 'GetMany' },
            { type: 'DeleteOne', cascade },
          ],
          extraImports: [
            DynamicApiModule.forFeature({ entity: CommentEntity, controllerOptions: { path: 'comments' }, routes: [] }),
          ],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(SoftPostEntity);
          const commentModel = await getModelFromEntity(CommentEntity);
          const [post] = await postModel.insertMany([{ title: 'soft-parent' }]);
          postId = post._id.toString();
          await commentModel.insertMany([{ postId, body: 'should-survive' }]);
        },
      );
    });

    it('should soft-delete the post but leave comments untouched', async () => {
      const { status } = await server.delete(`/soft-posts/${postId}`) as SupertestResponse;

      expect(status).toBe(200);

      // Comments should still exist
      const commentModel = await getModelFromEntity(CommentEntity);
      const remaining = await commentModel.find({ postId }).lean().exec();
      expect(remaining).toHaveLength(1);
    });
  });
});

// Keep import for DynamicApiModule accessible via initApp's import of it














