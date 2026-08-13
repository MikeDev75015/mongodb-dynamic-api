import { BadRequestException, Body, Optional, Param, Request, Type, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiHideProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RouteDecoratorsBuilder } from '../../builders';
import { EntityParam } from '../../dtos';
import { applyFromUser, addVersionSuffix, getMixinData, isEmpty, provideName, RouteDecoratorsHelper } from '../../helpers';
import { MergeIdParamInterceptor } from '../../interceptors';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiRequest, Mappable } from '../../interfaces';
import { RoutePoliciesGuardMixin, EntityBodyMixin, EntityPresenterMixin, stripProtectedFields } from '../../mixins';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { UpdateOneController, UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneService } from './update-one-service.interface';

function UpdateOneControllerMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], broadcast: broadcastConfig, fromUser, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateOneControllerConstructor<Entity> {
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

  class UpdateOneBody extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {
    // Populated internally by `MergeIdParamInterceptor` from the `:id` route param, never sent
    // by the client — not part of the public request shape. Declared (with a decorator, so
    // `whitelist: true` doesn't strip it) purely so `@IsUnique(Entity, { ignoreId: 'id' })` can
    // read it off the validated DTO instance, the same way it already can on WebSocket updates.
    @ApiHideProperty()
    @IsOptional()
    @IsString()
    id?: string;
  }

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

    constructor(
      protected readonly service: UpdateOneService<Entity>,
      @Optional() protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {}

    @RouteDecoratorsHelper(routeDecoratorsBuilder)
    @UseGuards(UpdateOnePoliciesGuard)
    @UseInterceptors(new MergeIdParamInterceptor(), ...useInterceptors)
    async updateOne(@Param('id') id: string, @Body() body: UpdateOneBody, @Request() req?: DynamicApiRequest) {
      // `body.id` only exists for `@IsUnique`'s `ignoreId` (see `MergeIdParamInterceptor`) — it's
      // never real update data, so it must not count towards emptiness nor reach the DB write.
      const { id: _ignoredId, ...bodyData } = body as UpdateOneBody & { id?: string };

      if (isEmpty(bodyData)) {
        throw new BadRequestException('Invalid request body');
      }

      const toEntity = (
        UpdateOneBody as Mappable<Entity>
      ).toEntity;

      const rawPartial = toEntity ? toEntity(bodyData) : bodyData as Partial<Entity>;
      const partial = applyFromUser(stripProtectedFields(rawPartial, this.entity), fromUser, req?.user);

      const entity = await this.service.updateOne(id, partial, req?.user);

      const fromEntity = (
        UpdateOnePresenter as Mappable<Entity>
      ).fromEntity;

      const responseData = fromEntity ? fromEntity<UpdateOnePresenter>(entity) : entity;

      this.broadcastService?.broadcastFromHttp(event, [responseData as object], broadcastConfig);

      return responseData;
    }
  }

  Object.defineProperty(BaseUpdateOneController, 'name', {
    value: `Base${provideName('UpdateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return BaseUpdateOneController;
}

export { UpdateOneControllerMixin };
