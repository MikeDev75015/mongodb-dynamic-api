import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prop, Schema } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { AfterSaveCallback, BaseEntity, DynamicApiModule } from '../../src';
import { closeTestingApp, createTestingApp, server } from '../e2e.setup';
import 'dotenv/config';

/**
 * E2E — createOneDocument / createManyDocuments return plain objects with every schema field.
 *
 * `model.create()` returns hydrated Mongoose documents whose schema fields are prototype getters.
 * Spreading them used to copy only Mongoose internals (`$__`, `_doc`, …), so every field but `id`
 * came back `undefined`. The documents returned to callbacks must now match what `findOneDocument`
 * (lean) returns.
 */

@Schema({ collection: 'create-doc-lobbies' })
class LobbyEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  gameType: string;

  @Prop({ type: String, required: true })
  familyId: string;

  @Prop({ type: [String], default: [] })
  playerIds: string[];
}

@Schema({ collection: 'create-doc-matches' })
class MatchEntity extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;
}

type CreatedDocument = Partial<LobbyEntity> & Record<string, unknown>;

describe('createOneDocument / createManyDocuments in callbacks (e2e)', () => {
  let createdOne: CreatedDocument | undefined;
  let createdMany: CreatedDocument[] | undefined;
  let foundOne: CreatedDocument | undefined;

  beforeEach(() => {
    createdOne = undefined;
    createdMany = undefined;
    foundOne = undefined;
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  async function buildApp(callback: AfterSaveCallback<MatchEntity>) {
    DynamicApiModule.state['resetState']();

    const moduleRef = await Test.createTestingModule({
      imports: [
        DynamicApiModule.forRoot(process.env.MONGO_DB_URL),
        DynamicApiModule.forFeature({
          entity: MatchEntity,
          controllerOptions: { path: 'matches' },
          routes: [{ type: 'CreateOne', callback }],
        }),
        DynamicApiModule.forFeature({
          entity: LobbyEntity,
          controllerOptions: { path: 'lobbies' },
        }),
      ],
    }).compile();

    await createTestingApp(moduleRef);
  }

  it('createOneDocument should return every schema field, like findOneDocument', async () => {
    await buildApp(async (match, methods) => {
      createdOne = await methods.createOneDocument(LobbyEntity, {
        gameType: 'domino',
        familyId: `family-${match.id}`,
        playerIds: ['p1', 'p2', 'p3'],
      }) as unknown as CreatedDocument;
      foundOne = await methods.findOneDocument(LobbyEntity, { _id: createdOne.id }) as unknown as CreatedDocument;
    });

    const { status, body } = await server.post('/matches', { name: 'final' });
    expect(status).toBe(201);

    expect(createdOne).toBeDefined();
    expect(createdOne).toMatchObject({
      id: expect.any(String),
      gameType: 'domino',
      familyId: `family-${body.id}`,
      playerIds: ['p1', 'p2', 'p3'],
    });
    expect(createdOne).not.toHaveProperty('$__');
    expect(createdOne).not.toHaveProperty('_doc');
    expect(createdOne.id).toBe(createdOne._id.toString());
    expect(JSON.parse(JSON.stringify(createdOne))).toStrictEqual(JSON.parse(JSON.stringify(foundOne)));
  });

  it('createManyDocuments should return every schema field of each created document', async () => {
    await buildApp(async (match, methods) => {
      createdMany = await methods.createManyDocuments(LobbyEntity, [
        { gameType: 'domino', familyId: 'f1', playerIds: ['a'] },
        { gameType: 'battleship', familyId: 'f2', playerIds: ['b', 'c'] },
      ]) as unknown as CreatedDocument[];
    });

    const { status } = await server.post('/matches', { name: 'semi' });
    expect(status).toBe(201);

    expect(createdMany).toHaveLength(2);
    expect(createdMany).toEqual([
      expect.objectContaining({ id: expect.any(String), gameType: 'domino', familyId: 'f1', playerIds: ['a'] }),
      expect.objectContaining({ id: expect.any(String), gameType: 'battleship', familyId: 'f2', playerIds: ['b', 'c'] }),
    ]);
    createdMany.forEach((doc) => {
      expect(doc).not.toHaveProperty('$__');
      expect(doc.id).toBe(doc._id.toString());
    });
  });
});
