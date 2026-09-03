import { BadRequestException, Body, Optional, Query, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { applyFromUser } from '../../helpers/from-user.helper';
import { addVersionSuffix } from '../../helpers/versioning-config.helper';
import { getMixinData } from '../../helpers/mixin-data.helper';
import { isEmpty } from '../../helpers/lodash.helper';
import { provideName } from '../../helpers/format.helper';
import { RouteDecoratorsHelper } from '../../helpers/route-decorators.helper';
import { DynamicApiControllerOptions, DynamicApiRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { DuplicateManyController, DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicApiRouteConfig<Entity>,
  version?: string,
): DuplicateManyControllerConstructor<Entity> {
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

  class DuplicateManyPoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseDuplicateManyController implements DuplicateManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateManyService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(DuplicateManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async duplicateMany(@Query('ids') ids: string[], @Body() body?: DuplicateManyBody, @Request() req?: DynamicApiRequest) {
      if (!ids?.length) {
        throw new BadRequestException('Invalid query');
      }

      const toEntity = (
        DuplicateManyBody as Mappable<Entity>
      ).toEntity;

      const rawPartial = !isEmpty(body) && toEntity ? toEntity(body) : body as Partial<Entity>;
      const partial = applyFromUser(stripProtectedFields(rawPartial, this.entity), fromUser, req?.user);

      const list = await this.service.duplicateMany(
        ids,
        partial,
        req?.user,
      );

      const fromEntities = (
        DuplicateManyPresenter as Mappable<Entity>
      ).fromEntities;

      const responseData = fromEntities ? fromEntities<DuplicateManyPresenter>(list) : list;

      this.broadcastService?.broadcastFromHttp(event, responseData as object[], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseDuplicateManyController, 'name', {
    value: `Base${provideName('DuplicateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseDuplicateManyController;
}

export { DuplicateManyControllerMixin };
