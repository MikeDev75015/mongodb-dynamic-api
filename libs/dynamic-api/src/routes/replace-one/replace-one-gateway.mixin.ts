import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { kebabCase } from 'lodash';
import { EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneGateway, ReplaceOneGatewayConstructor } from './replace-one-gateway.interface';
import { ReplaceOneService } from './replace-one-service.interface';

function ReplaceOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): ReplaceOneGatewayConstructor<Entity> {
  const {
    routeType,
    isPublic,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const event = routeConfig.eventName ?? kebabCase(`${controllerOptions.path}/${routeType}`);

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
      @MessageBody() body: EntityParam & Partial<Entity>,
    ) {
      if (!body?.id || Object.keys(body).length === 1) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { id, ...partialEntity } = body;

      return {
        event,
        data: await this.service.replaceOne(id, partialEntity as unknown as Partial<Entity>),
      };
    }
  }

  Object.defineProperty(BaseReplaceOneGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseReplaceOneGateway;
}

export { ReplaceOneGatewayMixin };
