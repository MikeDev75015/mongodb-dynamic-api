import { Body, Param, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { addVersionSuffix, getMixinData, provideName, RouteDecoratorsHelper } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateOneController, UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneService } from './update-one-service.interface';

function UpdateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateOneControllerConstructor<Entity> {
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

  class UpdateOneBody extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(UpdateOneBody, 'name', {
    value: `UpdateOne${displayedName}${addVersionSuffix(version)}Dto`,
    writable: false,
  });

  class UpdateOnePresenter extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(UpdateOnePresenter, 'name', {
    value: dTOs?.presenter
      ? `UpdateOne${displayedName}${addVersionSuffix(version)}Presenter`
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
      body: UpdateOneBody,
      presenter: UpdateOnePresenter,
    },
  );

  class UpdateOnePoliciesGuard extends RoutePoliciesGuardMixin(
    entity,
    routeType,
    displayedName,
    version,
    abilityPredicate,
  ) {}

  class BaseUpdateOneController implements UpdateOneController<Entity> {
    protected readonly entity = entity;

    constructor(protected readonly service: UpdateOneService<Entity>) {
    }

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(UpdateOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    async updateOne(@Param('id') id: string, @Body() body: UpdateOneBody) {
      if (isEmpty(body)) {
        throw new Error('Invalid request body');
      }

      const toEntity = (
        UpdateOneBody as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.updateOne(id, toEntity ? toEntity(body) : body as Partial<Entity>);

      const fromEntity = (
        UpdateOnePresenter as Mappable<Entity>
      ).fromEntity;

      return fromEntity ? fromEntity<UpdateOnePresenter>(entity) : entity;
    }
  }

  Object.defineProperty(BaseUpdateOneController, 'name', {
    value: `Base${provideName('UpdateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseUpdateOneController;
}

export { UpdateOneControllerMixin };
