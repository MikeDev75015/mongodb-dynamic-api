import { Type } from '@nestjs/common';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type as TypeTransformer } from 'class-transformer';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { DeletePresenter, EntityParam, EntityQuery } from '../dtos';
import { DTOsBundle, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../mixins';
import { BaseEntity } from '../models';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';
import { getFormattedApiTag } from './format.helper';
import { addVersionSuffix } from './versioning-config.helper';

function getDTOsByRouteType<Entity extends BaseEntity>(
  entity: Type<Entity>,
  routeType: string,
  displayedName: string,
  version: string,
  dTOs: DTOsBundle,
) {
  const {
    query: CustomQuery,
    param: CustomParam,
    body: CustomBody,
    presenter: CustomPresenter,
  } = dTOs ?? {};

  switch (routeType) {
    case 'CreateMany': {
      const { body: CustomBody, presenter: CustomPresenter } = dTOs ?? {};

      class DtoBody extends EntityBodyMixin(entity) {}

      Object.defineProperty(DtoBody, 'name', {
        value: `${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class CreateManyBody {
        @ApiProperty({ type: [DtoBody] })
        @ValidateNested({ each: true })
        @IsInstance(DtoBody, { each: true })
        @ArrayMinSize(1)
        @TypeTransformer(() => DtoBody)
        list: DtoBody[];
      }

      class RouteBody extends PickType(CustomBody ?? CreateManyBody, ['list']) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `CreateMany${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteBody,
        RoutePresenter,
      };
    }

    case 'CreateOne': {
      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `CreateOne${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteBody,
        RoutePresenter,
      };
    }

    case 'DeleteMany': {
      class RoutePresenter extends (
        CustomPresenter ?? DeletePresenter
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `Delete${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return { RoutePresenter };
    }

    case 'DeleteOne': {
      Object.defineProperty(EntityParam, 'name', {
        value: `DeleteOne${displayedName}${addVersionSuffix(version)}Param`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? DeletePresenter
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `Delete${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        EntityParam,
        RoutePresenter,
      };
    }

    case 'DuplicateMany': {
      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity, true)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `DuplicateMany${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteBody,
        RoutePresenter,
      };
    }

    case 'DuplicateOne': {
      Object.defineProperty(EntityParam, 'name', {
        value: `DuplicateOne${displayedName}${addVersionSuffix(version)}Param`,
        writable: false,
      });

      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity, true)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `DuplicateOne${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        EntityParam,
        RouteBody,
        RoutePresenter,
      };
    }

    case 'GetMany': {
      class RouteQuery extends (
        CustomQuery ?? EntityQuery
      ) {}

      Object.defineProperty(RouteQuery, 'name', {
        value: CustomQuery ? CustomQuery.name : `GetMany${displayedName}${addVersionSuffix(version)}Query`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteQuery,
        RoutePresenter,
      };
    }

    case 'GetOne': {
      class RouteQuery extends (
        CustomQuery ?? EntityQuery
      ) {}

      Object.defineProperty(RouteQuery, 'name', {
        value: CustomQuery ? CustomQuery.name : `GetOne${displayedName}${addVersionSuffix(version)}Query`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteQuery,
        RoutePresenter,
      };
    }

    case 'ReplaceOne': {
      Object.defineProperty(EntityParam, 'name', {
        value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Param`,
        writable: false,
      });

      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `ReplaceOne${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        EntityParam,
        RouteBody,
        RoutePresenter,
      };
    }

    case 'UpdateMany': {
      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity, true)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `UpdateMany${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

      return {
        RouteBody,
        RoutePresenter,
      };
    }

    case 'UpdateOne': {
      class RouteParam extends (
        CustomParam ?? EntityParam
      ) {}

      Object.defineProperty(RouteParam, 'name', {
        value: CustomParam ? CustomParam.name : `UpdateOne${displayedName}${addVersionSuffix(version)}Param`,
        writable: false,
      });

      class RouteBody extends (
        CustomBody ?? EntityBodyMixin(entity, true)
      ) {}

      Object.defineProperty(RouteBody, 'name', {
        value: CustomBody ? CustomBody.name : `UpdateOne${displayedName}${addVersionSuffix(version)}Dto`,
        writable: false,
      });

      class RoutePresenter extends (
        CustomPresenter ?? EntityPresenterMixin(entity)
      ) {}

      Object.defineProperty(RoutePresenter, 'name', {
        value: CustomPresenter ? CustomPresenter.name : `${displayedName}${addVersionSuffix(version)}Presenter`,
        writable: false,
      });

        return {
          RouteParam,
          RouteBody,
          RoutePresenter,
        };
    }

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

  Object.defineProperty(EntityParam, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Param`,
    writable: false,
  });

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  return {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
    ...getDTOsByRouteType(entity, routeType, displayedName, version, dTOs),
  };
}

export { getControllerMixinData };
