import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, server } from '../e2e.setup';
import { initApp } from '../shared';
import { getModelFromEntity } from '../utils';
import 'dotenv/config';

@Schema({ collection: 'e2e-populate-authors' })
class AuthorEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;
}

@Schema({ collection: 'e2e-populate-posts' })
class PostEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'AuthorEntity', required: true })
  author: mongoose.Types.ObjectId;
}

describe('DynamicApiModule forFeature - populate (e2e)', () => {
  let postId: string;

  const seedAuthorAndPost = async (_: Connection) => {
    const authorModel = await getModelFromEntity(AuthorEntity);
    const author = await authorModel.create({ name: 'Jane Doe' });

    const postModel = await getModelFromEntity(PostEntity);
    const post = await postModel.create({ title: 'Hello world', author: author._id });
    postId = post._id.toString();
  };

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('GetOne/GetMany with populate configured on the route', () => {
    beforeEach(async () => {
      await initApp(
        {
          entity: PostEntity,
          controllerOptions: { path: 'populate-posts' },
          routes: [
            { type: 'GetOne', populate: 'author' },
            { type: 'GetMany', populate: 'author' },
          ],
          // AuthorEntity must be registered on the app's own Mongoose connection — populate()
          // resolves `ref: 'AuthorEntity'` against models compiled on the querying connection,
          // not against the separate connection getModelFromEntity uses for seeding below.
          extraImports: [
            DynamicApiModule.forFeature({ entity: AuthorEntity, controllerOptions: { path: 'populate-authors' }, routes: [] }),
          ],
        },
        {},
        seedAuthorAndPost,
      );
    });

    it('GET /populate-posts/:id returns author as a populated object, not a bare id', async () => {
      const { body, status } = await server.get(`/populate-posts/${postId}`);

      expect(status).toBe(200);
      expect(body.author).toMatchObject({ name: 'Jane Doe' });
    });

    it('GET /populate-posts returns author populated for every item', async () => {
      const { body, status } = await server.get('/populate-posts');

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].author).toMatchObject({ name: 'Jane Doe' });
    });
  });

  describe('GetOne without populate configured', () => {
    beforeEach(async () => {
      await initApp(
        { entity: PostEntity, controllerOptions: { path: 'populate-posts' } },
        {},
        seedAuthorAndPost,
      );
    });

    it('GET /populate-posts/:id returns the bare author reference (no populate configured)', async () => {
      const { body, status } = await server.get(`/populate-posts/${postId}`);

      expect(status).toBe(200);
      expect(body.author).not.toHaveProperty('name');
    });
  });
});
