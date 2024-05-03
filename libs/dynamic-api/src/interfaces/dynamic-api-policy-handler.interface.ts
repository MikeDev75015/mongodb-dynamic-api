import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';

interface PoliciesGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

type PoliciesGuardConstructor<Entity extends BaseEntity> = new (model: Model<Entity>) => PoliciesGuard;

export { PoliciesGuardConstructor, PoliciesGuard };
