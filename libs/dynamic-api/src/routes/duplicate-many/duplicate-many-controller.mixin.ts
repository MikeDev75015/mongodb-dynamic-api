import { Body, Query, Type, UseGuards } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyController, DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateManyControllerConstructor<Entity> {
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

  class DuplicateManyBody extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(DuplicateManyBody, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class DuplicateManyPresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(DuplicateManyPresenter, 'name', {
    value: dTOs?.presenter
      ? `${routeType}${displayedName}${addVersionSuffix(version)}Presenter`
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
      body: DuplicateManyBody,
      presenter: DuplicateManyPresenter,
    },
  );

  class DuplicateManyPoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDuplicateManyController implements DuplicateManyController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DuplicateManyService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DuplicateManyPoliciesGuard)
    async duplicateMany(@Query('ids') ids: string[], @Body() body?: DuplicateManyBody) {
      if (!ids?.length) {
        throw new Error('Invalid query');
      }

      const toEntity = (
        DuplicateManyBody as Mappable<Entity>
      ).toEntity;

      const list = await this.service.duplicateMany(
        ids,
        !isEmpty(body) && toEntity ? toEntity(body) : body as Partial<Entity>,
      );

      const fromEntities = (
        DuplicateManyPresenter as Mappable<Entity>
      ).fromEntities;

      return fromEntities ? fromEntities<DuplicateManyPresenter>(list) : list;
    }
  }

  Object.defineProperty(BaseDuplicateManyController, 'name', {
    value: `Base${provideName('DuplicateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDuplicateManyController;
}

export { DuplicateManyControllerMixin };
