import { describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  CallbackMethods,
  AfterSaveCallback,
  CallbackRetryOptions,
  PopulateConfig,
  QueryScope,
  RouteProjection,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseGetManyService } from './base-get-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseGetManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  populate: PopulateConfig | undefined;
  queryScope: QueryScope<TestEntity> | undefined;
  projection: RouteProjection<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseGetManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const response = [{ _id: 'ObjectId', __v: 1, name: 'test' }];

  const initService = (exec = vi.fn()) => {
    modelMock = {
      find: vi.fn(() => ({
        lean: vi.fn(() => ({ exec })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have getMany method', () => {
    service = initService();
    expect(service).toHaveProperty('getMany');
  });

  describe('getMany', () => {
    it('should call model.find and return the response', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      await expect(service.getMany()).resolves.toStrictEqual([
        { ...documentWithoutIdAndVersion, id: response[0]._id },
      ]);
      expect(modelMock.find).toHaveBeenCalledWith({});
    });

    it('should reject a query carrying a MongoDB operator key without querying the database', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.getMany({ owner: { $ne: null } })).rejects.toThrow(BadRequestException);
      expect(modelMock.find).not.toHaveBeenCalled();
    });

    it('should call model.find with soft deletable query', async () => {
      const exec = vi.fn().mockResolvedValueOnce([]);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getMany();
      expect(modelMock.find).toHaveBeenCalledWith({ isDeleted: false });
    });

    it('should call callback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const user = { id: 'userId' };
      await service.getMany(undefined, user);

      expect(callback).toHaveBeenCalledWith({ ...response[0], id: response[0]._id }, internal(service).callbackMethods, user);
    });

    it('should not throw and should still return the full list when callback rejects', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = vi.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      await expect(service.getMany()).resolves.toStrictEqual([
        { ...documentWithoutIdAndVersion, id: response[0]._id },
      ]);
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.getMany();

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should populate the query when populate is configured', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      const findQueryMock: { populate: Mock; lean: Mock } = {
        populate: vi.fn(),
        lean: vi.fn(() => ({ exec })),
      };
      findQueryMock.populate.mockReturnValue(findQueryMock);
      modelMock = {
        find: vi.fn(() => findQueryMock),
      } as unknown as Model<TestEntity>;
      service = new TestService(modelMock);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).populate = ['author', 'comments'];

      await service.getMany();

      expect(findQueryMock.populate).toHaveBeenCalledWith(['author', 'comments']);
    });

    describe('queryScope', () => {
      const user = { id: 'userId' };

      it.each([
        ['sync', (): { name: string } => ({ name: 'mine' })],
        ['async', async (): Promise<{ name: string }> => ({ name: 'mine' })],
      ])('should merge a %s scope into model.find through $and', async (_, scopeFn) => {
        const exec = vi.fn().mockResolvedValueOnce(response);
        service = initService(exec);
        vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
        const queryScope = vi.fn(scopeFn);
        internal(service).queryScope = queryScope;

        await service.getMany({ name: 'theirs' }, user);

        expect(queryScope).toHaveBeenCalledWith(user);
        expect(modelMock.find).toHaveBeenCalledWith({
          isDeleted: false,
          name: 'theirs',
          $and: [{ name: 'mine' }],
        });
      });

      it('should keep an empty scope ("no restriction") in the query', async () => {
        const exec = vi.fn().mockResolvedValueOnce(response);
        service = initService(exec);
        vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
        internal(service).queryScope = () => ({});

        await expect(service.getMany()).resolves.toHaveLength(1);
        expect(modelMock.find).toHaveBeenCalledWith({ $and: [{}] });
      });

      it.each([
        ['null', null],
        ['undefined', undefined],
      ])('should return [] without querying the database when the scope is %s', async (_, scope) => {
        service = initService();
        vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
        internal(service).queryScope = () => scope;
        const callback = vi.fn();
        internal(service).callback = callback;

        await expect(service.getMany(undefined, user)).resolves.toStrictEqual([]);
        expect(modelMock.find).not.toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
      });

      it('should still apply the filter predicate on the scoped documents', async () => {
        const documents = [
          { _id: 'id1', __v: 1, name: 'allowed' },
          { _id: 'id2', __v: 1, name: 'denied' },
        ];
        service = initService(vi.fn().mockResolvedValueOnce(documents));
        vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
        internal(service).queryScope = () => ({ name: { $in: ['allowed', 'denied'] } });
        Object.defineProperty(service, 'abilityPredicate', {
          value: (entity: TestEntity) => entity.name === 'allowed', configurable: true,
        });
        Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });

        const result = await service.getMany(undefined, user);

        expect(result.map(({ name }) => name)).toStrictEqual(['allowed']);
      });
    });

    describe('projection', () => {
      const initSelectableService = (exec: Mock) => {
        const findQueryMock: { select: Mock; lean: Mock } = {
          select: vi.fn(),
          lean: vi.fn(() => ({ exec })),
        };
        findQueryMock.select.mockReturnValue(findQueryMock);
        modelMock = { find: vi.fn(() => findQueryMock) } as unknown as Model<TestEntity>;
        service = new TestService(modelMock);
        vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

        return findQueryMock;
      };

      it('should select a static projection', async () => {
        const findQueryMock = initSelectableService(vi.fn().mockResolvedValueOnce(response));
        internal(service).projection = { name: 0 };

        await service.getMany();

        expect(findQueryMock.select).toHaveBeenCalledWith({ name: 0 });
      });

      it('should select the projection derived from the user', async () => {
        const findQueryMock = initSelectableService(vi.fn().mockResolvedValueOnce(response));
        const projection = vi.fn(() => 'name');
        internal(service).projection = projection;
        const user = { id: 'userId' };

        await service.getMany(undefined, user);

        expect(projection).toHaveBeenCalledWith(user);
        expect(findQueryMock.select).toHaveBeenCalledWith('name');
      });

      it('should not select anything when the projection function returns undefined', async () => {
        const findQueryMock = initSelectableService(vi.fn().mockResolvedValueOnce(response));
        internal(service).projection = () => undefined;

        await service.getMany();

        expect(findQueryMock.select).not.toHaveBeenCalled();
      });
    });

    it('should filter documents when predicateBehavior is filter and abilityPredicate rejects some', async () => {
      const documents = [
        { _id: 'id1', __v: 1, name: 'allowed' },
        { _id: 'id2', __v: 1, name: 'denied' },
      ];
      const exec = vi.fn().mockResolvedValueOnce(documents);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: (entity: TestEntity) => entity.name === 'allowed', configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });
      const user = { id: 'userId' };

      const result = await service.getMany(undefined, user);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('allowed');
    });

    it('should return empty array when predicateBehavior is filter and abilityPredicate rejects all', async () => {
      const documents = [{ _id: 'id1', __v: 1, name: 'denied' }];
      const exec = vi.fn().mockResolvedValueOnce(documents);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });

      const result = await service.getMany();

      expect(result).toEqual([]);
    });

    it('should return all documents when predicateBehavior is filter and abilityPredicate allows all', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => true, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      const result = await service.getMany();

      expect(result).toStrictEqual([{ ...documentWithoutIdAndVersion, id: response[0]._id }]);
    });

    it('should not filter when predicateBehavior is throw (default behavior)', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'throw', configurable: true });
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      // predicateBehavior 'throw' means guard handles it — service just returns all
      const result = await service.getMany();

      expect(result).toStrictEqual([{ ...documentWithoutIdAndVersion, id: response[0]._id }]);
    });
  });
});
