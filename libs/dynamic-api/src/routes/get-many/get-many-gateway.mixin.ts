import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { kebabCase } from 'lodash';
import { EntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { getControllerMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyGateway, GetManyGatewayConstructor } from './get-many-gateway.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetManyGatewayConstructor<Entity> {
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

  class RouteQuery extends (
    routeConfig.dTOs?.query ?? EntityQuery
  ) {}

  const event = routeConfig.eventName ?? kebabCase(`${routeType}/${displayedName}`);

  class BaseGetManyGateway extends BaseGateway<Entity> implements GetManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: GetManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }
    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async getMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: RouteQuery,
    ) {
      this.addUserToSocket(socket, isPublic);

      return {
        event,
        data: await this.service.getMany(body),
      };
    }
  }

  Object.defineProperty(BaseGetManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseGetManyGateway;
}

export { GetManyGatewayMixin };
