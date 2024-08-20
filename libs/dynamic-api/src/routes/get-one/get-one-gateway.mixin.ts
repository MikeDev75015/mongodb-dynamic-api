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
import { GetOneGateway, GetOneGatewayConstructor } from './get-one-gateway.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetOneGatewayConstructor<Entity> {
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

  class BaseGetOneGateway extends BaseGateway<Entity> implements GetOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: GetOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async getOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam,
    ) {
      if (!body?.id) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      return {
        event,
        data: await this.service.getOne(body.id),
      };
    }
  }

  Object.defineProperty(BaseGetOneGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseGetOneGateway;
}

export { GetOneGatewayMixin };
