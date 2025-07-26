import { Type, UseFilters, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import {
  Aggregatable,
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  ExtendedSocket,
  GatewayResponse,
  Mappable,
} from '../../interfaces';
import { SocketPoliciesGuardMixin } from '../../mixins';
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
    abilityPredicate,
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

  class AggregatePoliciesGuard extends SocketPoliciesGuardMixin(
    entity,
    routeType,
    event,
    version,
    abilityPredicate,
    isPublic,
  ) {}

  class BaseAggregateGateway extends BaseGateway<Entity> implements AggregateGateway<
    Entity,
    AggregateData,
    AggregateResponse
  > {
    protected readonly entity = entity;

    constructor(
      protected readonly service: AggregateService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard(isPublic), AggregatePoliciesGuard)
    @SubscribeMessage(event)
    async aggregate(
      @ConnectedSocket() _socket: ExtendedSocket<Entity>,
      @MessageBody() data: AggregateData,
    ): GatewayResponse<AggregateResponse[]> {
      const toPipeline = (
        AggregateData as Aggregatable<AggregateData>
      ).toPipeline;

      if (!toPipeline) {
        throw new WsException('Query DTO must have toPipeline static method');
      }

      const { list, count, totalPage } = await this.service.aggregate(toPipeline(plainToInstance(AggregateData, data)));

      const fromAggregate = (
        AggregateResponse as Mappable<Entity>
      ).fromAggregate;

      return {
        event,
        data: fromAggregate ? fromAggregate(list, count, totalPage) : list,
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
