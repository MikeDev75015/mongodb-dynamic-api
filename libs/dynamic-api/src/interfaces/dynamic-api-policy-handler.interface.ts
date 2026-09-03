import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';

/** @internal Not part of the public API. */
interface PoliciesGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/** @internal Not part of the public API. */
type PoliciesGuardConstructor<Entity extends BaseEntity> = new (model: Model<Entity>) => PoliciesGuard;
/** @internal Not part of the public API. */
type AuthPoliciesGuardConstructor = new () => PoliciesGuard;

export { PoliciesGuardConstructor, PoliciesGuard, AuthPoliciesGuardConstructor };
