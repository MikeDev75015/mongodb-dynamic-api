import { Body, Param, Type, UseGuards } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { CreatePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateOneController, DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateOneControllerConstructor<Entity> {
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

  class DuplicateOneBody extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(DuplicateOneBody, 'name', {
    value: `DuplicateOne${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class DuplicateOnePresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(DuplicateOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `DuplicateOne${displayedName}${addVersionSuffix(version)}Presenter`
      : `${displayedName}${addVersionSuffix(version)}Presenter`,
    writable: false,
  });

  const routeDecoratorsBuilder = new RouteDecoratorsBuilder(
    'DuplicateOne',
    entity,
    routeConfig.subPath,
    version,
    description,
    isPublic,
    {
      param: EntityParam,
      body: DuplicateOneBody,
      presenter: DuplicateOnePresenter,
    },
  );

  class DuplicateOnePoliciesGuard extends CreatePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDuplicateOneController implements DuplicateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: DuplicateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DuplicateOnePoliciesGuard)
    async duplicateOne(@Param('id') id: string, @Body() body?: DuplicateOneBody) {
      const toEntity = (
        DuplicateOneBody as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.duplicateOne(
        id,
        !isEmpty(body) && toEntity ? toEntity(body) : body as Partial<Entity>,
      );

      const fromEntity = (
        DuplicateOnePresenter as Mappable<Entity>
      ).fromEntity;

      return fromEntity ? fromEntity(entity) : entity;
    }
  }

  Object.defineProperty(BaseDuplicateOneController, 'name', {
    value: `Base${provideName('DuplicateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDuplicateOneController;
}

export { DuplicateOneControllerMixin };
