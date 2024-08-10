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
import { DuplicateOneGateway, DuplicateOneGatewayConstructor } from './duplicate-one-gateway.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateOneGatewayConstructor<Entity> {
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

  class BaseDuplicateOneGateway extends BaseGateway<Entity> implements DuplicateOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async duplicateOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam & Partial<Entity>,
    ) {
      if (!body?.id) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { id, ...partialEntity } = body;

      return {
        event,
        data: await this.service.duplicateOne(id, partialEntity as unknown as Partial<Entity>),
      };
    }
  }

  Object.defineProperty(BaseDuplicateOneGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDuplicateOneGateway;
}

export { DuplicateOneGatewayMixin };
