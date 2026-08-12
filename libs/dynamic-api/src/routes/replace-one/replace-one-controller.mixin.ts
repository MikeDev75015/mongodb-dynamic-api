import { Body, Optional, Param, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { applyFromUser, addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { ReplaceOneController, ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): ReplaceOneControllerConstructor<Entity> {
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
    false,
    broadcastConfig,
  );

  class ReplaceOneBody extends (
    dTOs?.body ?? EntityBodyMixin(entity)
  ) {}

  Object.defineProperty(ReplaceOneBody, 'name', {
    value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class ReplaceOnePresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(ReplaceOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `ReplaceOne${displayedName}${addVersionSuffix(version)}Presenter`
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
      body: ReplaceOneBody,
      presenter: ReplaceOnePresenter,
    },
  );

  class ReplaceOnePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseReplaceOneController implements ReplaceOneController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: ReplaceOneService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(ReplaceOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async replaceOne(@Param('id') id: string, @Body() body: ReplaceOneBody, @Request() req?: DynamicApiRequest) {
      const toEntity = (
        ReplaceOneBody as Mappable<Entity>
      ).toEntity;

      const rawPartial = toEntity ? toEntity(body) : body as Partial<Entity>;
      const partial = applyFromUser(stripProtectedFields(rawPartial, this.entity), fromUser, req?.user);

      const entity = await this.service.replaceOne(id, partial, req?.user);

      const fromEntity = (
        ReplaceOnePresenter as Mappable<Entity>
      ).fromEntity;

      const responseData = fromEntity ? fromEntity<ReplaceOnePresenter>(entity) : entity;

      this.broadcastService?.broadcastFromHttp(event, [responseData as object], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseReplaceOneController, 'name', {
    value: `Base${provideName('ReplaceOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseReplaceOneController;
}

export { ReplaceOneControllerMixin };
