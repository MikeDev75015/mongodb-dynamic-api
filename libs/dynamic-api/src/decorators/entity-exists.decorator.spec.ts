import 'reflect-metadata';
import { createMock } from '@golevelup/ts-jest';
import { validate } from 'class-validator';
import { Error as MongooseError, Model } from 'mongoose';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services';
import { EntityExists } from './entity-exists.decorator';

class TargetEntity extends BaseEntity {
  isActive: boolean;
}

describe('EntityExists', () => {
  let model: Model<TargetEntity>;
  let getEntityModelSpy: jest.SpyInstance;

  beforeEach(() => {
    model = createMock<Model<TargetEntity>>();
    getEntityModelSpy =
      // @ts-ignore
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
  });

  it('should pass without querying the database when the value is undefined, null or empty', async () => {
    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    for (const value of [undefined, null, '']) {
      const dto = Object.assign(new Dto(), { targetId: value });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    }
    expect(getEntityModelSpy).not.toHaveBeenCalled();
  });

  it('should pass by default when a document matches the id', async () => {
    model.exists = jest.fn().mockResolvedValue({ _id: 'ref-id' });

    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'ref-id' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(getEntityModelSpy).toHaveBeenCalledWith(TargetEntity);
    expect(model.exists).toHaveBeenCalledWith({ _id: 'ref-id' });
  });

  it('should fail with a default message when no document matches', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'missing-id' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      entityExists: 'Referenced TargetEntity does not exist',
    });
  });

  it('should query the overridden field when the `field` option is set', async () => {
    model.exists = jest.fn().mockResolvedValue({ _id: 'ref-id' });

    class Dto {
      @EntityExists(TargetEntity, { field: 'isActive' })
      flag: string;
    }

    const dto = Object.assign(new Dto(), { flag: 'true' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({ isActive: 'true' });
  });

  it('should merge the dynamic `filter` result into the existence query', async () => {
    model.exists = jest.fn().mockResolvedValue({ _id: 'ref-id' });

    class Dto {
      @EntityExists(TargetEntity, {
        filter: (_value, dto) => ({ isActive: true, ownerId: (dto as Dto).ownerId }),
      })
      targetId: string;

      ownerId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'ref-id', ownerId: 'owner-1' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({
      _id: 'ref-id',
      isActive: true,
      ownerId: 'owner-1',
    });
  });

  it('should query only by field when no `filter` option is provided', async () => {
    model.exists = jest.fn().mockResolvedValue({ _id: 'ref-id' });

    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'ref-id' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({ _id: 'ref-id' });
  });

  it('should fail cleanly with the default message when the id is malformed (Mongoose CastError)', async () => {
    model.exists = jest.fn().mockRejectedValue(new MongooseError.CastError('ObjectId', 'not-an-id', '_id'));

    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'not-an-id' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      entityExists: 'Referenced TargetEntity does not exist',
    });
  });

  it('should not swallow a non-CastError raised while querying', async () => {
    model.exists = jest.fn().mockRejectedValue(new Error('connection lost'));

    class Dto {
      @EntityExists(TargetEntity)
      targetId: string;
    }

    const dto = Object.assign(new Dto(), { targetId: 'ref-id' });

    await expect(validate(dto)).rejects.toThrow('connection lost');
  });
});
