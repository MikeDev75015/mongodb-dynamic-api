import { Body, Optional, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { applyFromUser, addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { CreateOneController, CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateOneControllerConstructor<Entity> {
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

  class CreateOnePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateOneController implements CreateOneController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateOneService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async createOne(@Body() body: CreateOneBody, @Request() req?: DynamicApiRequest) {
      const toEntity = (
        CreateOneBody as Mappable<Entity>
      ).toEntity;

      const rawPartial = toEntity ? toEntity(body) : body as Partial<Entity>;
      const partial = applyFromUser(stripProtectedFields(rawPartial, this.entity), fromUser, req?.user);

      const entity = await this.service.createOne(partial, req?.user);

      const fromEntity = (
        CreateOnePresenter as Mappable<Entity>
      ).fromEntity;

      const responseData = fromEntity ? fromEntity(entity) : entity;

      this.broadcastService?.broadcastFromHttp(event, [responseData], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseCreateOneController, 'name', {
    value: `Base${provideName('CreateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseCreateOneController;
}

export { CreateOneControllerMixin };
