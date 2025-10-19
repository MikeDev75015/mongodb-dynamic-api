import { Type, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin, SocketPoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateOneGateway, UpdateOneGatewayConstructor } from './update-one-gateway.interface';
import { UpdateOneService } from './update-one-service.interface';

function UpdateOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateOneGatewayConstructor<Entity> {
  const {
    routeType,
    displayedName,
    isPublic,
    event,
    abilityPredicate,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
    true,
  );

  class UpdateOneData extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(UpdateOneData, 'name', {
    value: `UpdateOne${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class UpdateOneResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(UpdateOneResponse, 'name', {
    value: dTOs?.presenter
      ? `UpdateOne${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class UpdateOnePoliciesGuard extends SocketPoliciesGuardMixin(
    entity,
    routeType,
    event,
    version,
    abilityPredicate,
    isPublic,
  ) {}

  class BaseUpdateOneGateway extends BaseGateway<Entity> implements UpdateOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: UpdateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard(isPublic), UpdateOnePoliciesGuard)
    @UseInterceptors(...useInterceptors)
    @SubscribeMessage(event)
    async updateOne(
      @ConnectedSocket() _socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam & UpdateOneData,
    ) {
      if (!body?.id || Object.keys(body).length === 1) {
        throw new WsException('Invalid request body');
      }

      const { id, ...data } = body;

      const toEntity = (
        UpdateOneData as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.updateOne(id, toEntity ? toEntity(data) : data as Partial<Entity>);

      const fromEntity = (
        UpdateOneResponse as Mappable<Entity>
      ).fromEntity;

      return {
        event,
        data: fromEntity ? fromEntity<UpdateOneResponse>(entity) : entity,
      };
    }
  }

  Object.defineProperty(BaseUpdateOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseUpdateOneGateway;
}

export { UpdateOneGatewayMixin };
