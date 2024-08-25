import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { ReplaceOneGateway, ReplaceOneGatewayConstructor } from './replace-one-gateway.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): ReplaceOneGatewayConstructor<Entity> {
  const {
    routeType,
    displayedName,
    isPublic,
    event,
  } = getMixinData(
    entity,
    controllerOptions,
    routeConfig,
    true,
  );

  class ReplaceOneData extends (
    dTOs?.body ?? EntityBodyMixin(entity)
  ) {}

  Object.defineProperty(ReplaceOneData, 'name', {
    value: `ReplaceOne${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class ReplaceOneResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(ReplaceOneResponse, 'name', {
    value: dTOs?.presenter
      ? `ReplaceOne${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseReplaceOneGateway extends BaseGateway<Entity> implements ReplaceOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: ReplaceOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async replaceOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam & ReplaceOneData,
    ) {
      if (!body?.id || Object.keys(body).length === 1) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { id, ...data } = body;

      const toEntity = (
        ReplaceOneData as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.replaceOne(id, toEntity ? toEntity(data) : data as Partial<Entity>);

      const fromEntity = (
        ReplaceOneResponse as Mappable<Entity>
      ).fromEntity;

      return {
        event,
        data: fromEntity ? fromEntity<ReplaceOneResponse>(entity) : entity,
      };
    }
  }

  Object.defineProperty(BaseReplaceOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseReplaceOneGateway;
}

export { ReplaceOneGatewayMixin };
