import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from '../interfaces';
import { BaseEntity } from '../models';

const CHECK_POLICIES_KEY = 'check_policy';
const CheckPolicies = <Entity extends BaseEntity>(...handlers: PolicyHandler<Entity>[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

export { CheckPolicies, CHECK_POLICIES_KEY };
