import { Body, Type, UseGuards } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateOneController, CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateOneControllerConstructor<Entity> {
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

  class CreateOneBody extends (dTOs?.body ?? EntityBodyMixin(entity)) {}

  Object.defineProperty(CreateOneBody, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class CreateOnePresenter extends (dTOs?.presenter ?? EntityPresenterMixin(entity)) {}

  Object.defineProperty(CreateOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `CreateOne${displayedName}${addVersionSuffix(version)}Presenter`
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
      body: CreateOneBody,
      presenter: CreateOnePresenter,
    },
  );

  class CreateOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateOneController implements CreateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: CreateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateOnePoliciesGuard)
    async createOne(@Body() body: CreateOneBody) {
      const toEntity = (
        CreateOneBody as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.createOne(toEntity ? toEntity(body) : body as Partial<Entity>);

      const fromEntity = (
        CreateOnePresenter as Mappable<Entity>
      ).fromEntity;

      return fromEntity ? fromEntity(entity) : entity;
    }
  }

  Object.defineProperty(BaseCreateOneController, 'name', {
    value: `Base${provideName('CreateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseCreateOneController;
}

export { CreateOneControllerMixin };
