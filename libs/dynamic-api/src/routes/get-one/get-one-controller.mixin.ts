import { Param, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetOneController, GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetOneControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
  );

  class GetOnePresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(GetOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `GetOne${displayedName}${addVersionSuffix(version)}Presenter`
      : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    routeType,
    entity,
    routeConfig.subPath,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      presenter: GetOnePresenter,
    },
  );

  class GetOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseGetOneController implements GetOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: GetOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(GetOnePoliciesGuard)
    async getOne(@Param('id') id: string) {
      const entity = await this.service.getOne(id);

      const fromEntity = (
        GetOnePresenter as Mappable<Entity>
      ).fromEntity;

      return fromEntity ? fromEntity<GetOnePresenter>(entity) : entity;
    }
  }

  Object.defineProperty(BaseGetOneController, 'name', {
    value: `Base${provideName('GetOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseGetOneController;
}

export { GetOneControllerMixin };
