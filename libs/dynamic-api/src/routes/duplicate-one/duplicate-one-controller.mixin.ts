import { Body, Optional, Param, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getMixinData, isEmpty, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { DuplicateOneController, DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateOneControllerConstructor<Entity> {
  const {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
    event,
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

  class DuplicateOnePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDuplicateOneController implements DuplicateOneController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateOneService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DuplicateOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
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

      const responseData = fromEntity ? fromEntity(entity) : entity;

      this.broadcastService?.broadcastFromHttp(event, [responseData as object], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseDuplicateOneController, 'name', {
    value: `Base${provideName('DuplicateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDuplicateOneController;
}

export { DuplicateOneControllerMixin };
