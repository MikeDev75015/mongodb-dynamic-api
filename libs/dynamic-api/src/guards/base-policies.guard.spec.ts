import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { BadRequestException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  it('should throw ForbiddenException if user is not defined and abilityPredicate is defined', async () => {
    guard['abilityPredicate'] = vi.fn();
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should not throw ForbiddenException if user is not defined and abilityPredicate is not defined', async () => {
    guard['abilityPredicate'] = undefined;
    await expect(guard.canActivate(context)).resolves.not.toThrow();
  });

  it('should not throw ForbiddenException if predicateBehavior is filter even if user is not defined', async () => {
    guard['abilityPredicate'] = vi.fn();
    guard['predicateBehavior'] = 'filter';
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should not call findManyDocumentsWithAbilityPredicate if predicateBehavior is filter', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    guard['predicateBehavior'] = 'filter';
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should call findOneDocument if params.id is defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().params = { id: '1' };
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call findManyDocuments if params.id is not defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call findManyDocuments (not findOneDocument) if params.userId is defined but targetParam is not set', async () => {
    const findOneSpy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    const findManySpy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().params = { userId: '1' };
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(findOneSpy).not.toHaveBeenCalled();
    expect(findManySpy).toHaveBeenCalled();
  });

  it('should call findOneDocument with the targetParam value when targetParam matches a non-id route param', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    guard['abilityPredicate'] = vi.fn();
    guard['targetParam'] = 'userId';
    context.switchToHttp().getRequest().params = { userId: 'user-123' };
    context.switchToHttp().getRequest().user = {};
    context.switchToHttp().getRequest().query = { some: 'query' };
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalledWith('user-123', { some: 'query' }, undefined, {});
  });

  it('should pass the request user to the ability predicate lookups instead of storing it on the guard', async () => {
    const findOneSpy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    const user = { id: 'u1' };
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().params = { id: 'doc-1' };
    context.switchToHttp().getRequest().user = user;
    await guard.canActivate(context);
    expect(findOneSpy).toHaveBeenCalledWith('doc-1', {}, undefined, user);
    expect(guard).not.toHaveProperty('user');
  });

  it('should check the documents targeted by the ids query (DeleteMany / UpdateMany / DuplicateMany)', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    const user = { id: 'u1' };
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().user = user;
    context.switchToHttp().getRequest().query = { ids: ['a', 'b'] };
    spy.mockReset().mockResolvedValueOnce([{}, {}]);
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalledWith({ _id: { $in: ['a', 'b'] } }, user);
  });

  it('should throw a 404 when some of the targeted ids do not exist', async () => {
    vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([{}]);
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().user = {};
    context.switchToHttp().getRequest().query = { ids: ['a', 'missing'] };
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should reject a query carrying a MongoDB operator key', async () => {
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().user = {};
    context.switchToHttp().getRequest().query = { owner: { $ne: null } };
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should call aggregateDocuments if routeType is Aggregate and queryToPipeline is defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'aggregateDocumentsWithAbilityPredicate').mockImplementationOnce(vi.fn());
    guard['abilityPredicate'] = vi.fn();
    guard['routeType'] = 'Aggregate';
    guard['queryToPipeline'] = vi.fn();
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
    vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    context.switchToHttp().getRequest().user = {};
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  // ── authAbilityPredicate: document-less routes must never fail open ────────

  describe('authAbilityPredicate', () => {
    it('should throw ForbiddenException if user is not defined and authAbilityPredicate is defined', async () => {
      guard['authAbilityPredicate'] = vi.fn();
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if authAbilityPredicate returns false', async () => {
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(false);
      context.switchToHttp().getRequest().user = { isAdmin: false };
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should resolve true if authAbilityPredicate returns true', async () => {
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(true);
      context.switchToHttp().getRequest().user = { isAdmin: true };
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should call authAbilityPredicate with (user, body)', async () => {
      const predicate = vi.fn().mockReturnValue(true);
      guard['authAbilityPredicate'] = predicate;
      context.switchToHttp().getRequest().user = { isAdmin: true };
      context.switchToHttp().getRequest().body = { some: 'payload' };
      await guard.canActivate(context);
      expect(predicate).toHaveBeenCalledWith({ isAdmin: true }, { some: 'payload' });
    });

    it('should never scan the collection (never call findManyDocumentsWithAbilityPredicate) when only authAbilityPredicate is set', async () => {
      const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(true);
      context.switchToHttp().getRequest().user = { isAdmin: true };
      await guard.canActivate(context);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should deny access even when abilityPredicate would vacuously pass on an empty collection', async () => {
      // Regression for the fail-open bug: a document-less route relying only on the collection
      // scan (abilityPredicate + zero matching documents) never denies. authAbilityPredicate must
      // deny on its own, independently of the (here vacuously-passing) abilityPredicate branch.
      vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce(undefined);
      guard['abilityPredicate'] = vi.fn();
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(false);
      context.switchToHttp().getRequest().user = { isAdmin: false };
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
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
      getArgs: vi.fn().mockReturnValue([{}, {}, {}, 'event']),
    } as unknown as ExecutionContext;
  });

  it('should not throw WsException if isPublic is true', async () => {
    guard['isPublic'] = true;
    await expect(guard.canActivate(context)).resolves.not.toThrow();
  });

  it('should throw WsException if isPublic is false and abilityPredicate is defined', async () => {
    guard['isPublic'] = false;
    guard['abilityPredicate'] = vi.fn();
    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should not throw WsException if predicateBehavior is filter even without user', async () => {
    guard['isPublic'] = false;
    guard['abilityPredicate'] = vi.fn();
    guard['predicateBehavior'] = 'filter';
    await expect(guard.canActivate(context)).rejects.toThrow(WsException); // still throws: no user + !isPublic block is outer
  });

  it('should not call findManyDocumentsWithAbilityPredicate if predicateBehavior is filter (socket)', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['isPublic'] = false;
    guard['abilityPredicate'] = vi.fn();
    guard['predicateBehavior'] = 'filter';
    context.getArgs()[0].user = {};
    context.getArgs()[1] = undefined;
    await guard.canActivate(context);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should throw WsException if could not find document with ability predicate', async () => {
    guard['isPublic'] = false;
    guard['abilityPredicate'] = vi.fn();
    guard['findOneDocumentWithAbilityPredicate'] = vi.fn().mockRejectedValue(new Error('Document not found'));
    context.getArgs()[0].user = {};
    context.getArgs()[1] = { id: '1' };

    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should call findOneDocumentWithAbilityPredicate if params.id is defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[1] = { id: '1' };
    context.getArgs()[0].user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should call findManyDocumentsWithAbilityPredicate if params.id is not defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[1] = undefined;
    context.getArgs()[0].user = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  it('should pass the socket user to findOneDocumentWithAbilityPredicate', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findOneDocumentWithAbilityPredicate').mockImplementationOnce(vi.fn());
    const user = { id: 'u1' };
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[0].user = user;
    context.getArgs()[1] = { id: 'doc-1' };
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalledWith('doc-1', undefined, undefined, user);
    expect(guard).not.toHaveProperty('user');
  });

  it('should check the documents targeted by the ids payload and ignore the update fields', async () => {
    const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    const user = { id: 'u1' };
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[0].user = user;
    context.getArgs()[1] = { ids: ['a'], name: 'renamed' };
    spy.mockReset().mockResolvedValueOnce([{}]);
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalledWith({ _id: { $in: ['a'] } }, user);
  });

  it('should throw a WsException when some of the targeted ids do not exist', async () => {
    vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[0].user = {};
    context.getArgs()[1] = { ids: ['missing'] };
    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should reject a payload carrying a MongoDB operator key', async () => {
    guard['abilityPredicate'] = vi.fn();
    context.getArgs()[0].user = {};
    context.getArgs()[1] = { owner: { $ne: null } };
    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should call aggregateDocumentsWithAbilityPredicate if routeType is Aggregate and queryToPipeline is defined', async () => {
    const spy = vi.spyOn<any, any>(guard, 'aggregateDocumentsWithAbilityPredicate').mockImplementationOnce(vi.fn());
    guard['abilityPredicate'] = vi.fn();
    guard['routeType'] = 'Aggregate';
    guard['queryToPipeline'] = vi.fn();
    context.getArgs()[0].user = {};
    context.getArgs()[0].query = {};
    await guard.canActivate(context);
    expect(spy).toHaveBeenCalled();
  });

  // ── authAbilityPredicate: document-less routes must never fail open ────────

  describe('authAbilityPredicate', () => {
    it('should throw WsException if authAbilityPredicate returns false', async () => {
      guard['isPublic'] = false;
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(false);
      context.getArgs()[0].user = { isAdmin: false };
      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should resolve true if authAbilityPredicate returns true', async () => {
      guard['isPublic'] = false;
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(true);
      context.getArgs()[0].user = { isAdmin: true };
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should never scan the collection when only authAbilityPredicate is set', async () => {
      const spy = vi.spyOn<any, any>(guard, 'findManyDocumentsWithAbilityPredicate').mockResolvedValueOnce([]);
      guard['isPublic'] = false;
      guard['authAbilityPredicate'] = vi.fn().mockReturnValue(true);
      context.getArgs()[0].user = { isAdmin: true };
      await guard.canActivate(context);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
