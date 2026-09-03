import { Body, Optional, Param, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos/entity.param';
import { applyFromUser } from '../../helpers/from-user.helper';
import { addVersionSuffix } from '../../helpers/versioning-config.helper';
import { getMixinData } from '../../helpers/mixin-data.helper';
import { isEmpty } from '../../helpers/lodash.helper';
import { provideName } from '../../helpers/format.helper';
import { RouteDecoratorsHelper } from '../../helpers/route-decorators.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { DuplicateOneController, DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
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
    false,
    broadcastConfig,
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
    async duplicateOne(@Param('id') id: string, @Body() body?: DuplicateOneBody, @Request() req?: DynamicApiRequest) {
      const toEntity = (
        DuplicateOneBody as Mappable<Entity>
      ).toEntity;

      const rawPartial = !isEmpty(body) && toEntity ? toEntity(body) : body as Partial<Entity>;
      const partial = applyFromUser(stripProtectedFields(rawPartial, this.entity), fromUser, req?.user);

      const entity = await this.service.duplicateOne(
        id,
        partial,
        req?.user,
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
