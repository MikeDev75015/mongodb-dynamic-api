import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, RouteDecoratorsHelper } from '../../helpers';
import { getControllerMixinData } from '../../helpers/controller-mixin.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { CreatePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteOneController, DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneService } from './delete-one-service.interface';

function DeleteOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteOneControllerConstructor<Entity> {
  const {
    routeType,
    description,
    isPublic,
    EntityParam,
    RoutePresenter,
    abilityPredicate,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      presenter: RoutePresenter,
    },
  );

  class DeleteOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    version,
    abilityPredicate,
  ) {}

  class BaseDeleteOneController implements DeleteOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DeleteOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DeleteOnePoliciesGuard)
    async deleteOne(@Param('id') id: string) {
      return this.service.deleteOne(id);
    }
  }

  Object.defineProperty(BaseDeleteOneController, 'name', {
    value: `BaseDeleteOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return BaseDeleteOneController;
}

export { DeleteOneControllerMixin };
