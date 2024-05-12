import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose, { Connection } from 'mongoose';
import {
  BaseEntity,
  DynamicApiForFeatureOptions,
  DynamicApiForRootOptions,
  DynamicApiModule,
  DynamicAPISchemaOptions,
  SoftDeletableEntity,
} from '../src';
import { closeTestingApp, createTestingApp, server } from './e2e.setup';
import 'dotenv/config';
import { getModelFromEntity } from './utils';

describe('DynamicApiModule forFeature (e2e)', () => {
  const uri = process.env.MONGO_DB_URL;

  const initApp = async <Entity extends BaseEntity>(
    forFeatureOptions: DynamicApiForFeatureOptions<Entity>,
    forRootOptions: DynamicApiForRootOptions<Entity> = {},
    initFixtures?: (connection: Connection) => Promise<void>,
    initMainCb?: (app: any) => Promise<void>,
  ) => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(uri, forRootOptions),
        DynamicApiModule.forFeature(forFeatureOptions),
      ],
    }).compile();

    await createTestingApp(moduleRef, initFixtures, initMainCb);
  };

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  describe('Entity extends BaseEntity', () => {
    @DynamicAPISchemaOptions({
      indexes: [{ fields: { name: 1 }, options: { unique: true } }],
    })
    @Schema({ collection: 'test-entities' })
    class TestEntity extends BaseEntity {
      @Prop({ type: String, required: true })
      name: string;

      @Prop({ type: String })
      group: string;
    }

    beforeEach(async () => {
      const fixtures = async (connection: Connection) => {
        const model = await getModelFromEntity(TestEntity);
        await model.insertMany([
          { name: 'test1' },
          { name: 'test2' },
        ]);
      };

      await initApp(
        {
          entity: TestEntity,
          controllerOptions: {
            path: 'test-entities',
          },
        },
        {},
        fixtures,
      );
    });

    describe('GET /test-entities', () => {
      it('should return all test entities', async () => {
        const { body, status } = await server.get('/test-entities');

        expect(status).toBe(200);
        expect(body).toEqual([
          {
            id: expect.any(String),
            name: 'test1',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: expect.any(String),
            name: 'test2',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ]);
      });
    });

    describe('GET /test-entities/:id', () => {
      let entities: TestEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should return a test entity by id', async () => {
        const { body, status } = await server.get(`/test-entities/${entities[0].id}`);

        expect(status).toBe(200);
        expect(body).toEqual(entities[0]);
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.get(`/test-entities/123`);

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });

    describe('POST /test-entities/many', () => {
      it('should create many test entities', async () => {
        const { body, status } = await server.post('/test-entities/many', {
          list: [
            { name: 'test3' },
            { name: 'test4' },
          ],
        });

        expect(status).toBe(201);
        expect(body).toEqual([
          {
            id: expect.any(String),
            name: 'test3',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: expect.any(String),
            name: 'test4',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ]);
      });

      it('should return 409 if entity has duplicated key', async () => {
        const { body, status } = await server.post('/test-entities/many', {
          list: [
            { name: 'test1' },
            { name: 'test2' },
          ],
        });

        expect(status).toBe(409);
        expect(body).toHaveProperty('error', 'Conflict');
        expect(body).toHaveProperty('statusCode', 409);
        expect(body).toHaveProperty('message', 'name \'test1\' is already used');
      });
    });

    describe('POST /test-entities', () => {
      it('should create a test entity', async () => {
        const { body, status } = await server.post('/test-entities', { name: 'test3' });

        expect(status).toBe(201);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test3',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 409 if entity has duplicated key', async () => {
        const { body, status } = await server.post('/test-entities', { name: 'test1' });

        expect(status).toBe(409);
        expect(body).toHaveProperty('error', 'Conflict');
        expect(body).toHaveProperty('statusCode', 409);
        expect(body).toHaveProperty('message', 'name \'test1\' is already used');
      });
    });

    describe('PUT /test-entities/:id', () => {
      let entityToReplace: TestEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToReplace = body.pop();
      });

      it('should replace a test entity by id', async () => {
        const { body, status } = await server.put(`/test-entities/${entityToReplace.id}`, { name: 'test-replaced' });

        expect(status).toBe(200);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test-replaced',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.put(`/test-entities/123`, { name: 'test1-updated' });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });

    describe('PATCH /test-entities', () => {
      let entities: TestEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should update many test entities', async () => {
        const { body, status } = await server.patch('/test-entities', {
          group: 'many-patched',
        }, { query: { ids: entities.map(({ id }) => id) } });

        expect(status).toBe(200);
        expect(body).toEqual([
          {
            ...entities[0],
            group: 'many-patched',
            updatedAt: expect.any(String),
          },
          {
            ...entities[1],
            group: 'many-patched',
            updatedAt: expect.any(String),
          },
        ]);
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.patch('/test-entities', {
          group: 'many-patched',
        }, { query: { ids: ['123'] } });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });

    describe('PATCH /test-entities/:id', () => {
      let entityToUpdate: TestEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToUpdate = body.pop();
      });

      it('should update a test entity by id', async () => {
        const { body, status } = await server.patch(`/test-entities/${entityToUpdate.id}`, { name: 'test-updated' });

        expect(status).toBe(200);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test-updated',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.patch(`/test-entities/123`, { name: 'test1-updated' });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });

    describe('DELETE /test-entities', () => {
      let entities: TestEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should delete many test entities', async () => {
        const { body, status } = await server.delete(
          '/test-entities',
          { query: { ids: entities.map(({ id }) => id) } },
        );

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 2 });

        const model = await getModelFromEntity(TestEntity);
        const updatedList = await model.find().lean().exec();

        expect(updatedList).toEqual([]);
      });

      it('should return 200 with 0 for deletedCount if one of entities is not found', async () => {
        const { body, status } = await server.delete('/test-entities', { query: { ids: [entities[0].id, '123'] } });

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 0 });
      });
    });

    describe('DELETE /test-entities/:id', () => {
      let entityToDelete: TestEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToDelete = body.pop();
      });

      it('should delete a test entity by id', async () => {
        const { body, status } = await server.delete(`/test-entities/${entityToDelete.id}`);

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 1 });
      });

      it('should return 200 with deletedCount at 0 if entity not found', async () => {
        const { body, status } = await server.delete(`/test-entities/123`);

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 0 });
      });
    });

    describe('POST /test-entities/duplicate', () => {
      let entities: TestEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should duplicate test entities', async () => {
        const { body, status } = await server.post('/test-entities/duplicate', {
          name: 'test1-duplicated',
          group: 'duplicated',
        }, { query: { ids: [entities[0].id] } });

        expect(status).toBe(201);
        expect(body).toEqual([
          {
            ...entities[0],
            id: expect.any(String),
            name: 'test1-duplicated',
            group: 'duplicated',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ]);
      });

      it('should return 404 if one of entities is not found', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate`, {
          group: 'duplicated',
        }, { query: { ids: [entities[0].id, '123'] } });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });

    describe('POST /test-entities/duplicate/:id', () => {
      let entityToDuplicate: TestEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToDuplicate = body.pop();
      });

      it('should duplicate a test entity by id', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate/${entityToDuplicate.id}`, {
          name: 'test2-duplicated',
        });

        expect(status).toBe(201);
        expect(body).toEqual({
          ...entityToDuplicate,
          id: expect.any(String),
          name: 'test2-duplicated',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate/123`, {
          name: 'test1-duplicated',
          group: 'duplicated',
        });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestEntity not found');
      });
    });
  });

  describe('Entity extends SoftDeletableEntity', () => {
    @DynamicAPISchemaOptions({
      indexes: [{ fields: { name: 1, deletedAt: 1 }, options: { unique: true } }],
    })
    @Schema({ collection: 'test-entities' })
    class TestDeletableEntity extends SoftDeletableEntity {
      @Prop({ type: String, required: true })
      name: string;

      @Prop({ type: String })
      group: string;
    }

    beforeEach(async () => {
      const fixtures = async (connection: Connection) => {
        const model = await getModelFromEntity(TestDeletableEntity);
        await model.insertMany([
          { name: 'test1' },
          { name: 'test2' },
        ]);
      };

      await initApp(
        {
          entity: TestDeletableEntity,
          controllerOptions: {
            path: 'test-entities',
          },
        },
        {},
        fixtures,
      );
    });

    describe('GET /test-entities', () => {
      it('should return all test entities', async () => {
        const { body, status } = await server.get('/test-entities');

        expect(status).toBe(200);
        expect(body).toEqual([
          {
            id: expect.any(String),
            name: 'test1',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            deletedAt: null,
          },
          {
            id: expect.any(String),
            name: 'test2',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            deletedAt: null,
          },
        ]);
      });
    });

    describe('GET /test-entities/:id', () => {
      let entities: TestDeletableEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should return a test entity by id', async () => {
        const { body, status } = await server.get(`/test-entities/${entities[0].id}`);

        expect(status).toBe(200);
        expect(body).toEqual(entities[0]);
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.get(`/test-entities/123`);

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });

    describe('POST /test-entities/many', () => {
      it('should create many test entities', async () => {
        const { body, status } = await server.post('/test-entities/many', {
          list: [
            { name: 'test3' },
            { name: 'test4' },
          ],
        });

        expect(status).toBe(201);
        expect(body).toEqual([
          {
            id: expect.any(String),
            name: 'test3',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            deletedAt: null,
          },
          {
            id: expect.any(String),
            name: 'test4',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            deletedAt: null,
          },
        ]);
      });

      it('should return 409 if entity has duplicated key', async () => {
        const { body, status } = await server.post('/test-entities/many', {
          list: [
            { name: 'test1' },
            { name: 'test2' },
          ],
        });

        expect(status).toBe(409);
        expect(body).toHaveProperty('error', 'Conflict');
        expect(body).toHaveProperty('statusCode', 409);
        expect(body).toHaveProperty('message', 'name \'test1\' is already used');
      });
    });

    describe('POST /test-entities', () => {
      it('should create a test entity', async () => {
        const { body, status } = await server.post('/test-entities', { name: 'test3' });

        expect(status).toBe(201);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test3',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          deletedAt: null,
        });
      });

      it('should return 409 if entity has duplicated key', async () => {
        const { body, status } = await server.post('/test-entities', { name: 'test1' });

        expect(status).toBe(409);
        expect(body).toHaveProperty('error', 'Conflict');
        expect(body).toHaveProperty('statusCode', 409);
        expect(body).toHaveProperty('message', 'name \'test1\' is already used');
      });
    });

    describe('PUT /test-entities/:id', () => {
      let entityToReplace: TestDeletableEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToReplace = body.pop();
      });

      it('should replace a test entity by id', async () => {
        const { body, status } = await server.put(`/test-entities/${entityToReplace.id}`, { name: 'test-replaced' });

        expect(status).toBe(200);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test-replaced',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          deletedAt: null,
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.put(`/test-entities/123`, { name: 'test1-updated' });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });

    describe('PATCH /test-entities', () => {
      let entities: TestDeletableEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should update many test entities', async () => {
        const { body, status } = await server.patch('/test-entities', {
          group: 'many-patched',
        }, { query: { ids: entities.map(({ id }) => id) } });

        expect(status).toBe(200);
        expect(body).toEqual([
          {
            ...entities[0],
            group: 'many-patched',
            updatedAt: expect.any(String),
          },
          {
            ...entities[1],
            group: 'many-patched',
            updatedAt: expect.any(String),
          },
        ]);
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.patch('/test-entities', {
          group: 'many-patched',
        }, { query: { ids: ['123'] } });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });

    describe('PATCH /test-entities/:id', () => {
      let entityToUpdate: TestDeletableEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToUpdate = body.pop();
      });

      it('should update a test entity by id', async () => {
        const { body, status } = await server.patch(`/test-entities/${entityToUpdate.id}`, { name: 'test-updated' });

        expect(status).toBe(200);
        expect(body).toEqual({
          id: expect.any(String),
          name: 'test-updated',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          deletedAt: null,
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.patch(`/test-entities/123`, { name: 'test1-updated' });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });

    describe('DELETE /test-entities', () => {
      let entities: TestDeletableEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should delete many test entities', async () => {
        const { body, status } = await server.delete(
          '/test-entities',
          { query: { ids: entities.map(({ id }) => id) } },
        );

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 2 });

        const model = await getModelFromEntity(TestDeletableEntity);
        const updatedList = await model.find().lean().exec();

        expect(updatedList).toEqual([
          {
            _id: expect.any(Object),
            __v: expect.any(Number),
            name: 'test1',
            isDeleted: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            deletedAt: expect.any(Date),
          },
          {
            _id: expect.any(Object),
            __v: expect.any(Number),
            name: 'test2',
            isDeleted: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            deletedAt: expect.any(Date),
          },
        ]);
      });

      it('should return 200 with 0 for deletedCount if one of entities is not found', async () => {
        const { body, status } = await server.delete('/test-entities', { query: { ids: [entities[0].id, '123'] } });

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 0 });
      });
    });

    describe('DELETE /test-entities/:id', () => {
      let entityToDelete: TestDeletableEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToDelete = body.pop();
      });

      it('should delete a test entity by id', async () => {
        const { body, status } = await server.delete(`/test-entities/${entityToDelete.id}`);

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 1 });
      });

      it('should return 200 with deletedCount at 0 if entity not found', async () => {
        const { body, status } = await server.delete(`/test-entities/123`);

        expect(status).toBe(200);
        expect(body).toEqual({ deletedCount: 0 });
      });
    });

    describe('POST /test-entities/duplicate', () => {
      let entities: TestDeletableEntity[];

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entities = body;
      });

      it('should duplicate test entities', async () => {
        const { body, status } = await server.post('/test-entities/duplicate', {
          name: 'test1-duplicated',
          group: 'duplicated',
        }, { query: { ids: [entities[0].id] } });

        expect(status).toBe(201);
        expect(body).toEqual([
          {
            ...entities[0],
            id: expect.any(String),
            name: 'test1-duplicated',
            group: 'duplicated',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ]);
      });

      it('should return 404 if one of entities is not found', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate`, {
          group: 'duplicated',
        }, { query: { ids: [entities[0].id, '123'] } });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });

    describe('POST /test-entities/duplicate/:id', () => {
      let entityToDuplicate: TestDeletableEntity;

      beforeEach(async () => {
        const { body } = await server.get('/test-entities');
        entityToDuplicate = body.pop();
      });

      it('should duplicate a test entity by id', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate/${entityToDuplicate.id}`, {
          name: 'test2-duplicated',
        });

        expect(status).toBe(201);
        expect(body).toEqual({
          ...entityToDuplicate,
          id: expect.any(String),
          name: 'test2-duplicated',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it('should return 404 if entity not found', async () => {
        const { body, status } = await server.post(`/test-entities/duplicate/123`, {
          name: 'test1-duplicated',
          group: 'duplicated',
        });

        expect(status).toBe(404);
        expect(body).toHaveProperty('error', 'Not Found');
        expect(body).toHaveProperty('statusCode', 404);
        expect(body).toHaveProperty('message', 'TestDeletableEntity not found');
      });
    });
  });
});
