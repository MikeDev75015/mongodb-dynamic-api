import { CanActivate, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { AbilityPredicate, RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { BaseService } from '../services';

export abstract class BasePoliciesGuard<Entity extends BaseEntity, Service extends BaseService<Entity>> implements CanActivate {
  protected routeType: RouteType;

  protected entity: Type<Entity>;

  protected abilityPredicate: AbilityPredicate<Entity> | undefined;

  protected constructor(protected readonly service: Service) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let { user, query, params } = context.switchToHttp().getRequest();

    if (this.abilityPredicate) {
      if (!user) {
        throw new ForbiddenException('Access Denied');
      }

      this.service.abilityPredicate = this.abilityPredicate;
      this.service.user = user;

      if (params?.id) {
        await this.service.findOneDocument(params.id, query);
      } else {
        await this.service.findManyDocuments(query);
      }
    }

    return true;
  }
}