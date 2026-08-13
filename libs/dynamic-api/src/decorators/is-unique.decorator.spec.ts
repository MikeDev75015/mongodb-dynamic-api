import 'reflect-metadata';
import { createMock } from '@golevelup/ts-jest';
import { validate } from 'class-validator';
import { Error as MongooseError, Model } from 'mongoose';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services';
import { IsUnique } from './is-unique.decorator';

class TargetEntity extends BaseEntity {
  email: string;
}

describe('IsUnique', () => {
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
      @IsUnique(TargetEntity)
      email: string;
    }

    for (const value of [undefined, null, '']) {
      const dto = Object.assign(new Dto(), { email: value });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    }
    expect(getEntityModelSpy).not.toHaveBeenCalled();
  });

  it('should pass when no document matches the decorated field value', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @IsUnique(TargetEntity)
      email: string;
    }

    const dto = Object.assign(new Dto(), { email: 'new@test.com' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(getEntityModelSpy).toHaveBeenCalledWith(TargetEntity);
    expect(model.exists).toHaveBeenCalledWith({ email: 'new@test.com' });
  });

  it('should fail with a default message when a document already has that value', async () => {
    model.exists = jest.fn().mockResolvedValue({ _id: 'existing-id' });

    class Dto {
      @IsUnique(TargetEntity)
      email: string;
    }

    const dto = Object.assign(new Dto(), { email: 'taken@test.com' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isUnique: 'email must be unique for TargetEntity',
    });
  });

  it('should query the overridden field when the `field` option is set', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @IsUnique(TargetEntity, { field: 'email' })
      login: string;
    }

    const dto = Object.assign(new Dto(), { login: 'someone@test.com' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({ email: 'someone@test.com' });
  });

  it('should use a case-insensitive regex filter when `caseInsensitive` is true', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @IsUnique(TargetEntity, { caseInsensitive: true })
      email: string;
    }

    const dto = Object.assign(new Dto(), { email: 'Mixed.Case@Test.com' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({
      email: { $regex: '^Mixed\\.Case@Test\\.com$', $options: 'i' },
    });
  });

  it('should exclude the current entity id from the check when `ignoreId` resolves to a truthy value', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @IsUnique(TargetEntity, { ignoreId: 'id' })
      email: string;

      id: string;
    }

    const dto = Object.assign(new Dto(), { email: 'me@test.com', id: 'my-id' });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({
      email: 'me@test.com',
      _id: { $ne: 'my-id' },
    });
  });

  it('should not add an id exclusion when `ignoreId` resolves to a falsy value', async () => {
    model.exists = jest.fn().mockResolvedValue(null);

    class Dto {
      @IsUnique(TargetEntity, { ignoreId: 'id' })
      email: string;

      id: string;
    }

    const dto = Object.assign(new Dto(), { email: 'me@test.com', id: undefined });
    await validate(dto);

    expect(model.exists).toHaveBeenCalledWith({ email: 'me@test.com' });
  });

  it('should fail cleanly with the default message when the query raises a Mongoose CastError', async () => {
    model.exists = jest.fn().mockRejectedValue(new MongooseError.CastError('ObjectId', 'not-an-id', '_id'));

    class Dto {
      @IsUnique(TargetEntity, { ignoreId: 'id' })
      email: string;

      id: string;
    }

    const dto = Object.assign(new Dto(), { email: 'me@test.com', id: 'not-an-id' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isUnique: 'email must be unique for TargetEntity',
    });
  });

  it('should not swallow a non-CastError raised while querying', async () => {
    model.exists = jest.fn().mockRejectedValue(new Error('connection lost'));

    class Dto {
      @IsUnique(TargetEntity)
      email: string;
    }

    const dto = Object.assign(new Dto(), { email: 'me@test.com' });

    await expect(validate(dto)).rejects.toThrow('connection lost');
  });
});
