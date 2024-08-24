import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { kebabCase } from 'lodash';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyBody } from './create-many-controller.interface';
import { CreateManyGateway, CreateManyGatewayConstructor } from './create-many-gateway.interface';
import { CreateManyService } from './create-many-service.interface';

function CreateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyGatewayConstructor<Entity> {
  const {
    routeType,
    displayedName,
    isPublic,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const event = routeConfig.eventName ?? kebabCase(`${routeType}/${displayedName}`);

  class BaseCreateManyGateway extends BaseGateway<Entity> implements CreateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async createMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: CreateManyBody,
    ) {
      if (!(
        'list' in body && Array.isArray(body.list) && body.list.length
      )) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const data = await this.service.createMany(body.list as unknown as Partial<Entity>[]);

      return {
        event,
        data,
      };
    }
  }

  Object.defineProperty(BaseCreateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseCreateManyGateway;
}

export { CreateManyGatewayMixin };
