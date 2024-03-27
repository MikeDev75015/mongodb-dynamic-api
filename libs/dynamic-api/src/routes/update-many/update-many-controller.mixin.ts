import { Body, Query, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { CheckPolicies } from '../../decorators';
import { addVersionSuffix, RouteDecoratorsHelper } from '../../helpers';
import { getControllerMixinData } from '../../helpers/controller-mixin.helper';
import { AppAbility, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateManyController, UpdateManyControllerConstructor } from './update-many-controller.interface';
import { UpdateManyService } from './update-many-service.interface';

function UpdateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateManyControllerConstructor<Entity> {
  const {
    routeType,
    description,
    isPublic,
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
    'UpdateMany',
    entity,
    version,
    description,
    isPublic,
    {
      body: RouteBody,
      presenter: RoutePresenter,
    },
  );

  class UpdateManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseUpdateManyController implements UpdateManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: UpdateManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(UpdateManyPoliciesGuard)
    @CheckPolicies((ability: AppAbility<Entity>) => ability.can(routeType, entity))
    // @ts-ignore
    async updateMany(@Query('ids') ids: string[], @Body() body: RouteBody) {
      return this.service.updateMany(ids, body as any);
    }
  }

  Object.defineProperty(BaseUpdateManyController, 'name', {
    value: `BaseUpdateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseUpdateManyController;
}

export { UpdateManyControllerMixin };
