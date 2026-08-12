import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
interface PoliciesGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
type PoliciesGuardConstructor<Entity extends BaseEntity> = new (model: Model<Entity>) => PoliciesGuard;
/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
type AuthPoliciesGuardConstructor = new () => PoliciesGuard;

export { PoliciesGuardConstructor, PoliciesGuard, AuthPoliciesGuardConstructor };
