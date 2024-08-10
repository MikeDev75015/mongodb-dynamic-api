import { Type } from '@nestjs/common';
import { PickType } from '@nestjs/swagger';
import { DeletePresenter, EntityParam } from '../dtos';
import { DTOsBundle, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../mixins';
import { BaseEntity } from '../models';
import { CreateManyBodyDtoMixin } from '../routes';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';
import { getFormattedApiTag } from './format.helper';
import { addVersionSuffix } from './versioning-config.helper';

function buildCreateManyBodyDTO<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string,
  CustomBody: Type,
): Type {
  class DtoBody extends EntityBodyMixin(entity) {}

  Object.defineProperty(DtoBody, 'name', {
    value: `${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class CreateManyBody extends CreateManyBodyDtoMixin(DtoBody) {}

  class RouteBody extends PickType(CustomBody ?? CreateManyBody, ['list']) {}

  Object.defineProperty(RouteBody, 'name', {
    value: CustomBody ? CustomBody.name : `CreateMany${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  return RouteBody;
}

function buildDeletePresenterDTO(
  displayedName: string,
  version: string,
  CustomPresenter: Type,
): Type {
  class RoutePresenter extends (
    CustomPresenter ?? DeletePresenter
  ) {}

  Object.defineProperty(RoutePresenter, 'name', {
    value: `Delete${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  return RoutePresenter;
}

function buildDefaultRouteBody<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: string,
  displayedName: string,
  version: string,
  CustomBody: Type,
): Type {
  const optionalBody = routeType !== 'CreateOne' && routeType !== 'ReplaceOne';

  class RouteBody extends (
    CustomBody ?? EntityBodyMixin(entity, optionalBody)
  ) {}

  Object.defineProperty(RouteBody, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  return RouteBody;
}

function buildDefaultRoutePresenter<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: string,
  displayedName: string,
  version: string,
  CustomPresenter: Type,
): Type {
  class RoutePresenter extends (
    CustomPresenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(RoutePresenter, 'name', {
    value: CustomPresenter
      ? `${routeType}${displayedName}${addVersionSuffix(version)}Presenter`
      : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  return RoutePresenter;
}

function getDTOsByRouteType<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: string,
  displayedName: string,
  version: string,
  dTOs: DTOsBundle,
) {
  const {
    body: CustomBody,
    presenter: CustomPresenter,
  } = dTOs ?? {};

  Object.defineProperty(EntityParam, 'name', {
    value: `${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  const RouteBody = buildDefaultRouteBody(entity, routeType, displayedName, version, CustomBody);
  const RoutePresenter = buildDefaultRoutePresenter(entity, routeType, displayedName, version, CustomPresenter);

  switch (routeType) {
    case 'CreateMany':
      return {
        RouteBody: buildCreateManyBodyDTO(entity, displayedName, version, CustomBody),
        RoutePresenter,
      };

    case 'DeleteMany':
      return {
        RoutePresenter: buildDeletePresenterDTO(displayedName, version, CustomPresenter),
      };

    case 'DeleteOne':
      return {
        EntityParam,
        RoutePresenter: buildDeletePresenterDTO(displayedName, version, CustomPresenter),
      };

    case 'CreateOne':
    case 'DuplicateMany':
    case 'UpdateMany':
      return {
        RouteBody,
        RoutePresenter,
      };

    case 'DuplicateOne':
    case 'ReplaceOne':
    case 'UpdateOne':
      return {
        RouteBody,
        RoutePresenter,
        EntityParam,
      };

    case 'GetMany':
      return {
        RoutePresenter,
      };

    case 'GetOne':
      return {
        EntityParam,
        RoutePresenter,
      };

    default:
      throw new Error(`Route type ${routeType} is not supported`);
  }
}

function getControllerMixinData<Entity extends BaseEntity>(
  entity: Type<Entity>,
  {
    path,
    apiTag,
    isPublic: isPublicController,
    abilityPredicates: controllerAbilityPredicates,
  }: DynamicApiControllerOptions<Entity>,
  {
    type: routeType,
    description,
    dTOs,
    isPublic: isPublicRoute,
    abilityPredicate: routeAbilityPredicate,
  }: DynamicAPIRouteConfig<Entity>,
  version?: string,
) {
  const displayedName = getFormattedApiTag(apiTag, entity.name);

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  return {
    ...getDTOsByRouteType(entity, routeType, displayedName, version, dTOs),
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
  };
}

export { getControllerMixinData };
