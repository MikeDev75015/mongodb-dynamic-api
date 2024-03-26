import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseEntity } from '../models';
import { AppAbility } from './dynamic-api-casl-ability.interface';

interface IPolicyHandler<Entity extends BaseEntity> {
  handle(ability: AppAbility<Entity>): boolean;
}

type PolicyHandlerCallback<Entity extends BaseEntity> = (ability: AppAbility<Entity>) => boolean;

type PolicyHandler<Entity extends BaseEntity> = IPolicyHandler<Entity> | PolicyHandlerCallback<Entity>;

interface PoliciesGuard<Entity extends BaseEntity> {
  canActivate(context: ExecutionContext): boolean;
}

type PoliciesGuardConstructor<Entity extends BaseEntity> = new (
  reflector: Reflector,
) => PoliciesGuard<Entity>;

export { PolicyHandler, PoliciesGuardConstructor, PoliciesGuard };
