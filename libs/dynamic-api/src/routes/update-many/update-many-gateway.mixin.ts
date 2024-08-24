import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty, kebabCase } from 'lodash';
import { ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyGateway, UpdateManyGatewayConstructor } from './update-many-gateway.interface';
import { UpdateManyService } from './update-many-service.interface';

function UpdateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateManyGatewayConstructor<Entity> {
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

  class BaseUpdateManyGateway extends BaseGateway<Entity> implements UpdateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: UpdateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async updateMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery & Partial<Entity>,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { ids, ...partialEntity } = body;

      if (isEmpty(partialEntity)) {
        throw new WsException('Invalid request body');
      }

      return {
        event,
        data: await this.service.updateMany(ids, partialEntity as unknown as Partial<Entity>),
      };
    }
  }

  Object.defineProperty(BaseUpdateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseUpdateManyGateway;
}

export { UpdateManyGatewayMixin };
