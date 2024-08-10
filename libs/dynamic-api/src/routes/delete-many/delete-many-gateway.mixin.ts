import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { kebabCase } from 'lodash';
import { ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyGateway, DeleteManyGatewayConstructor } from './delete-many-gateway.interface';
import { DeleteManyService } from './delete-many-service.interface';

function DeleteManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteManyGatewayConstructor<Entity> {
  const {
    routeType,
    isPublic,
  } = getControllerMixinData(
    entity,
    controllerOptions,
    routeConfig,
    version,
  );

  const event = kebabCase(`${controllerOptions.path}/${routeType}`);

  class BaseDeleteManyGateway extends BaseGateway<Entity> implements DeleteManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DeleteManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async deleteMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      return {
        event,
        data: await this.service.deleteMany(body.ids),
      };
    }
  }

  Object.defineProperty(BaseDeleteManyGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDeleteManyGateway;
}

export { DeleteManyGatewayMixin };
