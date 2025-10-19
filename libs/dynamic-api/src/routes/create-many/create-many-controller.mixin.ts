import { BadRequestException, Body, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { RouteDecoratorsBuilder } from '../../builders';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateManyBodyMixin } from './create-many-body.mixin';
import { CreateManyController, CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyPresenterMixin } from './create-many-presenter.mixin';
import { CreateManyService } from './create-many-service.interface';

function CreateManyControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyControllerConstructor<Entity> {
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
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(CreateManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async createMany(@Body() body: CreateManyBody) {
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

      const list = await this.service.createMany(toEntities ? toEntities(body) : toCreateList);

      const fromEntities = (
        CreateManyPresenter as Mappable<Entity>
      ).fromEntities;

      return fromEntities ? fromEntities<CreateManyPresenter>(list) : list;
    }
  }

  Object.defineProperty(BaseCreateManyController, 'name', {
    value: `Base${provideName('CreateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseCreateManyController;
}

export { CreateManyControllerMixin };
