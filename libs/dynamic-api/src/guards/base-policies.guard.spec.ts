import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';
import { BasePoliciesGuard, BaseSocketPoliciesGuard } from './base-policies.guard';

class TestEntity extends BaseEntity {
  // Define properties of the test entity if needed
}

describe('BasePoliciesGuard', () => {
  class PoliciesGuard<
    Entity extends BaseEntity = any,
  > extends BasePoliciesGuard<Entity> {
    constructor(model: Model<Entity>) {
      super(model);
    }
  }

  let guard: PoliciesGuard;
  let context: ExecutionContext;
  let model: Model<TestEntity>

  beforeEach(() => {
    model = {} as Model<TestEntity>;
    guard = new PoliciesGuard(model);
    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  it('should throw ForbiddenException if user is not defined and abilityPredicate is defined', async () => {
    guard['abilityPredicate'] = jest.fn();
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should not throw ForbiddenException if user is not defined and abilityPredicate is not defined', async () => {
    guard['abilityPredicate'] = undefined;
    await expect(guard.canActivate(context)).resolves.not.toThrow();
  });

  it('should call findOneDocument if params.id is defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().params = { id: '1' };
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call findManyDocuments if params.id is not defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call aggregateDocuments if routeType is Aggregate and queryToPipeline is defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'aggregateDocumentsWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    guard['routeType'] = 'Aggregate';
    guard['queryToPipeline'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    context.switchToHttp().getRequest().query = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should return true if abilityPredicate is not defined', async () => {
    guard['abilityPredicate'] = undefined;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should return true if abilityPredicate is defined', async () => {
    jest.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

describe('BaseSocketPoliciesGuard', () => {
  class SocketPoliciesGuard<
    Entity extends BaseEntity = any,
  > extends BaseSocketPoliciesGuard<Entity> {
    constructor(model: Model<Entity>) {
      super(model);
    }
  }

  let guard: SocketPoliciesGuard;
  let context: ExecutionContext;
  let model: Model<TestEntity>

  beforeEach(() => {
    model = {} as Model<TestEntity>;
    guard = new SocketPoliciesGuard(model);
    context = {
      getArgs: jest.fn().mockReturnValue([{}, {}, {}, 'event']),
    } as unknown as ExecutionContext;
  });

  it('should not throw WsException if isPublic is true', async () => {
    guard['isPublic'] = true;
    await expect(guard.canActivate(context)).resolves.not.toThrow();
  });

  it('should throw WsException if isPublic is false and abilityPredicate is defined', async () => {
    guard['isPublic'] = false;
    guard['abilityPredicate'] = jest.fn();
    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should throw WsException if could not find document with ability predicate', async () => {
    guard['isPublic'] = false;
    guard['abilityPredicate'] = jest.fn();
    guard['findOneDocumentWithAbilityPredicate'] = jest.fn().mockRejectedValue(new Error('Document not found'));
    context.getArgs()[0].user = {};
    context.getArgs()[1] = { id: '1' };

    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should call findOneDocumentWithAbilityPredicate if params.id is defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    context.getArgs()[1] = { id: '1' };
    context.getArgs()[0].user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call findManyDocumentsWithAbilityPredicate if params.id is not defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    context.getArgs()[1] = undefined;
    context.getArgs()[0].user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call aggregateDocumentsWithAbilityPredicate if routeType is Aggregate and queryToPipeline is defined', async () => {
    const spy = jest.spyOn<any, any>(guard, 'aggregateDocumentsWithAbilityPredicate').mockImplementationOnce(jest.fn());
    guard['abilityPredicate'] = jest.fn();
    guard['routeType'] = 'Aggregate';
    guard['queryToPipeline'] = jest.fn();
    context.getArgs()[0].user = {};
    context.getArgs()[0].query = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });
});
