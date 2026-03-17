import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';

/** @deprecated Internal API — will be removed from public exports in v5. */
interface PoliciesGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
type PoliciesGuardConstructor<Entity extends BaseEntity> = new (model: Model<Entity>) => PoliciesGuard;
/** @deprecated Internal API — will be removed from public exports in v5. */
type AuthPoliciesGuardConstructor = new () => PoliciesGuard;

export { PoliciesGuardConstructor, PoliciesGuard, AuthPoliciesGuardConstructor };
