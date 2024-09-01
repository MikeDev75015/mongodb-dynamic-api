import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import {
  Aggregatable,
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  ExtendedSocket,
  GatewayResponse,
  Mappable,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { AggregateGateway, AggregateGatewayConstructor } from './aggregate-gateway.interface';
import { AggregatePresenterMixin } from './aggregate-presenter.mixin';
import { AggregateService } from './aggregate-service.interface';

function AggregateGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): AggregateGatewayConstructor<Entity> {
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

  if (!dTOs?.query) {
    throw new WsException('Query DTO is required');
  }

  class AggregateData extends dTOs.query {}

  Object.defineProperty(AggregateData, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class AggregateResponse extends AggregatePresenterMixin(entity, dTOs?.presenter) {}

  Object.defineProperty(AggregateResponse, 'name', {
    value: dTOs?.presenter
      ? `${routeType}${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseAggregateGateway extends BaseGateway<Entity> implements AggregateGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: AggregateService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async aggregate(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: AggregateData,
    ): GatewayResponse<AggregateResponse[]> {
      if (isEmpty(body)) {
        throw new WsException('Invalid data');
      }

      const toPipeline = (
        AggregateData as Aggregatable<AggregateData>
      ).toPipeline;

      if (!toPipeline) {
        throw new WsException('Query DTO must have toPipeline static method');
      }

      this.addUserToSocket(socket, isPublic);

      const list = await this.service.aggregate(toPipeline(body));

      const fromEntities = (
        AggregateResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities(list) : list,
      };
    }
  }

  Object.defineProperty(BaseAggregateGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseAggregateGateway;
}

export { AggregateGatewayMixin };