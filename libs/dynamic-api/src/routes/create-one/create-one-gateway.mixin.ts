import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty, kebabCase } from 'lodash';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneGateway, CreateOneGatewayConstructor } from './create-one-gateway.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateOneGatewayConstructor<Entity> {
  const {
    routeType,
    isPublic,
    RouteBody,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const event = routeConfig.eventName ?? kebabCase(`${controllerOptions.path}/${routeType}`);

  class BaseCreateOneGateway extends BaseGateway<Entity> implements CreateOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async createOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      // @ts-ignore
      @MessageBody() body: RouteBody,
    ) {
      if (isEmpty(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const data = await this.service.createOne(body);

      return {
        event,
        data,
      };
    }
  }

  Object.defineProperty(BaseCreateOneGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseCreateOneGateway;
}

export { CreateOneGatewayMixin };
