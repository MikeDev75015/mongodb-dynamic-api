import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { AbilityPredicate, RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { BaseService } from '../services';

export abstract class BasePoliciesGuard<Entity extends BaseEntity> extends BaseService<Entity> implements CanActivate {
  protected routeType: RouteType;

  protected entity: Type<Entity>;

  protected abilityPredicate: AbilityPredicate<Entity> | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let { user, query, params } = context.switchToHttp().getRequest();

    if (this.abilityPredicate) {
      if (!user) {
        throw new ForbiddenException('Access Denied');
      }

      this.user = user;

      if (params?.id) {
        await this.findOneDocumentWithAbilityPredicate(params.id, query);
      } else {
        await this.findManyDocumentsWithAbilityPredicate(query);
      }
    }

    return true;
  }
}