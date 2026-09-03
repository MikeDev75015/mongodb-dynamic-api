import { BadRequestException, Body, Optional, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../../builders';
import { applyFromUser } from '../../helpers/from-user.helper';
import { addVersionSuffix } from '../../helpers/versioning-config.helper';
import { getMixinData } from '../../helpers/mixin-data.helper';
import { isEmpty } from '../../helpers/lodash.helper';
import { provideName } from '../../helpers/format.helper';
import { RouteDecoratorsHelper } from '../../helpers/route-decorators.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { CreateManyBodyMixin } from './create-many-body.mixin';
import { CreateManyController, CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyPresenterMixin } from './create-many-presenter.mixin';
import { CreateManyService } from './create-many-service.interface';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyControllerConstructor<Entity> {
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

  class CreateManyBody extends CreateManyBodyMixin(entity, dTOs?.body) {}

  Object.defineProperty(CreateManyBody, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class CreateManyPresenter extends CreateManyPresenterMixin(entity, dTOs?.presenter) {}

  Object.defineProperty(CreateManyPresenter, 'name', {
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
      body: CreateManyBody,
      presenter: CreateManyPresenter,
    },
  );

  class CreateManyPoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseCreateManyController implements CreateManyController<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateManyService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async createMany(@Body() body: CreateManyBody, @Request() req?: DynamicApiRequest) {
      if (!(
        'list' in body &&
        Array.isArray(body.list) &&
        body.list.length &&
        body.list.every((e: object) => !isEmpty(e))
      )) {
        throw new BadRequestException('Invalid request body');
      }

      let toCreateList = body.list as Partial<Entity>[];

      const toEntities = (
        CreateManyBody as Mappable<Entity>
      ).toEntities;

      const rawList = toEntities ? toEntities(body) : toCreateList;
      const list = await this.service.createMany(
        rawList.map((p) => applyFromUser(stripProtectedFields(p, this.entity), fromUser, req?.user)),
        req?.user,
      );

      const fromEntities = (
        CreateManyPresenter as Mappable<Entity>
      ).fromEntities;

      const responseData = fromEntities ? fromEntities<CreateManyPresenter>(list) : list;

      this.broadcastService?.broadcastFromHttp(event, responseData as object[], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseCreateManyController, 'name', {
    value: `Base${provideName('CreateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
