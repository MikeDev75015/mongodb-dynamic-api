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
import { DuplicateManyGateway, DuplicateManyGatewayConstructor } from './duplicate-many-gateway.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateManyGatewayConstructor<Entity> {
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

  class BaseDuplicateManyGateway extends BaseGateway<Entity> implements DuplicateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async duplicateMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery & Partial<Entity>,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { ids, ...partialEntity } = body;

      return {
        event,
        data: await this.service.duplicateMany(ids, partialEntity as unknown as Partial<Entity>),
      };
    }
  }

  Object.defineProperty(BaseDuplicateManyGateway, 'name', {
    value: `Base${provideName(routeType, entity.name, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDuplicateManyGateway;
}

export { DuplicateManyGatewayMixin };
