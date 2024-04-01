import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BaseEntity } from '../models';
import { BaseService } from '../services';
import { BasePoliciesGuard } from './base-policies.guard';

describe('BasePoliciesGuard', () => {
  class PoliciesGuard<
    Entity extends BaseEntity = any,
    Service extends BaseService<Entity> = any
  > extends BasePoliciesGuard<Entity, Service> {}

  let guard: PoliciesGuard;
  let context: ExecutionContext;
  let service: any;

  beforeEach(() => {
    service = {};
    // @ts-ignore
    guard = new PoliciesGuard(service);
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
    service.findOneDocument = jest.fn();
    context.switchToHttp().getRequest().params = { id: '1' };
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(service.findOneDocument).toHaveBeenCalled();
  });

  it('should call findManyDocuments if params.id is not defined', async () => {
    service.findManyDocuments = jest.fn();
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    await guard.canActivate(context);
    expect(service.findManyDocuments).toHaveBeenCalled();
  });

  it('should return true if abilityPredicate is not defined', async () => {
    guard['abilityPredicate'] = undefined;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should return true if abilityPredicate is defined', async () => {
    service.findManyDocuments = jest.fn();
    guard['abilityPredicate'] = jest.fn();
    context.switchToHttp().getRequest().user = {};
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});