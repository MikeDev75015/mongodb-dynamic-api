import { Body, Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, RouteDecoratorsHelper } from '../../helpers';
import { getControllerMixinData } from '../../helpers/controller-mixin.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { ReplaceOneController, ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): ReplaceOneControllerConstructor<Entity> {
  const {
    routeType,
    description,
    isPublic,
    EntityParam,
    RouteBody,
    RoutePresenter,
    abilityPredicate,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'ReplaceOne',
    entity,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  class ReplaceOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseReplaceOneController implements ReplaceOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: ReplaceOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(ReplaceOnePoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    // @ts-ignore
    async replaceOne(@Param('id') id: string, @Body() body: RouteBody) {
      return this.service.replaceOne(id, body as any);
    }
  }

  Object.defineProperty(BaseReplaceOneController, 'name', {
    value: `BaseReplaceOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseReplaceOneController;
}

export { ReplaceOneControllerMixin };
