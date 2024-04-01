import { ExecutionContext } from '@nestjs/common';
import { BaseEntity } from '../models';
import { BaseService } from '../services';

interface PoliciesGuard<Entity extends BaseEntity> {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

type PoliciesGuardConstructor<Entity extends BaseEntity> = new (service: BaseService<Entity>) => PoliciesGuard<Entity>;

export { PoliciesGuardConstructor, PoliciesGuard };
