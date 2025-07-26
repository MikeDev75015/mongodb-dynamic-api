import { Type, UseFilters, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { EntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityPresenterMixin, SocketPoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetManyGateway, GetManyGatewayConstructor } from './get-many-gateway.interface';
import { GetManyService } from './get-many-service.interface';

function GetManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetManyGatewayConstructor<Entity> {
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

  class GetManyData extends (dTOs?.query ?? EntityQuery) {}

  Object.defineProperty(GetManyData, 'name', {
    value: `GetMany${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class GetManyResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(GetManyResponse, 'name', {
    value: dTOs?.presenter
      ? `GetMany${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class GetManyPoliciesGuard extends SocketPoliciesGuardMixin(
    entity,
    routeType,
    event,
    version,
    abilityPredicate,
    isPublic,
  ) {}

  class BaseGetManyGateway extends BaseGateway<Entity> implements GetManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: GetManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }
    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard(isPublic), GetManyPoliciesGuard)
    @SubscribeMessage(event)
    async getMany(
      @ConnectedSocket() _socket: ExtendedSocket<Entity>,
      @MessageBody() body: GetManyData,
    ) {
      const list = await this.service.getMany(body);

      const fromEntities = (
        GetManyResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities<GetManyResponse>(list) : list,
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
