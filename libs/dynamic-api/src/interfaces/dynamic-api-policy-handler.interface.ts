import { MongoAbility } from '@casl/ability/dist/types';
import { ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

type AppAbility<Entity extends BaseEntity> = MongoAbility<[RouteType, Type<Entity>]>;

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

export { AppAbility, PolicyHandler, PoliciesGuardConstructor, PoliciesGuard };
