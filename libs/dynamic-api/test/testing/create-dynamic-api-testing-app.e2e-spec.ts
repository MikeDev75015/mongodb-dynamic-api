import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import * as supertestNamespace from 'supertest';
import { BaseEntity, DynamicApiModule } from '../../src';
import { createDynamicApiTestingApp } from '../../src/testing';
import 'dotenv/config';

// supertest's CJS `module.exports` is itself the callable request factory. Same tsc-CJS-vs-Vite-ESM
// interop split as auth.module.ts's cookieParser — see that file's comment for the full reasoning.
const request = (supertestNamespace as unknown as { default?: typeof supertestNamespace }).default ?? supertestNamespace;

@Schema({ collection: 'testing-helper-items' })
class TestingHelperItemEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;
}

describe('createDynamicApiTestingApp (e2e)', () => {
  describe('with an in-memory MongoDB (no uri passed)', () => {
    let testingApp: Awaited<ReturnType<typeof createDynamicApiTestingApp>>;

    beforeAll(async () => {
      testingApp = await createDynamicApiTestingApp({
        imports: [
          DynamicApiModule.forFeature({
            entity: TestingHelperItemEntity,
            controllerOptions: { path: 'testing-helper-items' },
          }),
        ],
      });
    });

    afterAll(() => testingApp.close());

    it('starts an in-memory MongoDB and returns its uri', () => {
      expect(testingApp.uri).toMatch(/^mongodb:\/\//);
    });

    it('serves the generated CRUD routes end-to-end, backed by the in-memory MongoDB', async () => {
      const { body: created } = await request(testingApp.app.getHttpServer())
      .post('/testing-helper-items')
      .send({ name: 'first-item' })
      .expect(201);

      expect(created).toMatchObject({ name: 'first-item' });

      const { body: fetched } = await request(testingApp.app.getHttpServer())
      .get(`/testing-helper-items/${created.id}`)
      .expect(200);

      expect(fetched).toMatchObject({ id: created.id, name: 'first-item' });
    });
  });

  describe('with a caller-provided uri', () => {
    let testingApp: Awaited<ReturnType<typeof createDynamicApiTestingApp>>;

    beforeAll(async () => {
      testingApp = await createDynamicApiTestingApp({ uri: process.env.MONGO_DB_URL });
    });

    afterAll(() => testingApp.close());

    it('uses the given uri instead of starting an in-memory MongoDB', () => {
      expect(testingApp.uri).toBe(process.env.MONGO_DB_URL);
    });
  });
});
