import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, CascadeConfig, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import { initApp } from '../shared';
import { getModelFromEntity } from '../utils';
import 'dotenv/config';

@Schema({ collection: 'e2e-tx-posts' })
class PostEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;
}

// Deliberately never registered via forFeature/extraImports — this.model.db.model(...) throws
// a real MissingSchemaError for it once the cascade step tries to resolve it, letting these
// tests force a genuine mid-transaction failure without any test-only hooks or mocking.
class UnregisteredCommentEntity extends BaseEntity {
  postId: string;
}

describe('DynamicApiModule forFeature - cascade transaction atomicity (e2e)', () => {
  let postId: string;

  const cascade: CascadeConfig[] = [
    { entity: UnregisteredCommentEntity, foreignKey: 'postId', on: 'delete' },
  ];

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('DeleteOne — cascade step fails mid-transaction', () => {
    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'tx-posts' },
          routes: [{ type: 'DeleteOne', cascade }],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(PostEntity);
          const [post] = await postModel.insertMany([{ title: 'parent' }]);
          postId = post._id.toString();
        },
      );
    });

    it('rolls back the parent delete when the cascade step fails — the whole operation is one atomic unit', async () => {
      const { status, body } = await server.delete(`/tx-posts/${postId}`);

      expect(status).toBe(200);
      expect(body).toMatchObject({ deletedCount: 0 });

      // The parent must still exist — with the old (non-transactional) cascade, it would already
      // have been deleted before the cascade step ran and failed, leaving an inconsistent state.
      const postModel = await getModelFromEntity(PostEntity);
      const survivor = await postModel.findById(postId).lean().exec();
      expect(survivor).not.toBeNull();
      expect(survivor.title).toBe('parent');
    });
  });

  describe('DeleteMany — cascade step fails mid-transaction', () => {
    let postIds: string[];

    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'tx-posts' },
          routes: [{ type: 'DeleteMany', cascade }],
        },
        {},
        async (_: Connection) => {
          const postModel = await getModelFromEntity(PostEntity);
          const posts = await postModel.insertMany([{ title: 'parent-1' }, { title: 'parent-2' }]);
          postIds = posts.map((post) => post._id.toString());
        },
      );
    });

    it('rolls back every parent delete when the cascade step fails', async () => {
      const { status, body } = await server.delete('/tx-posts', { query: { ids: postIds } });

      expect(status).toBe(200);
      expect(body).toMatchObject({ deletedCount: 0 });

      const postModel = await getModelFromEntity(PostEntity);
      const survivors = await postModel.find({ _id: { $in: postIds } }).lean().exec();
      expect(survivors).toHaveLength(2);
    });
  });
});
