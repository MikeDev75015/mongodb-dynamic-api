import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { GetOneGateway, GetOneGatewayConstructor } from './get-one-gateway.interface';
import { GetOneService } from './get-one-service.interface';

function GetOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): GetOneGatewayConstructor<Entity> {
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

  class GetOneResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(GetOneResponse, 'name', {
    value: dTOs?.presenter
      ? `GetOne${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseGetOneGateway extends BaseGateway<Entity> implements GetOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: GetOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async getOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam,
    ) {
      if (!body?.id) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const entity = await this.service.getOne(body.id);

      const fromEntity = (
        GetOneResponse as Mappable<Entity>
      ).fromEntity;

      return {
        event,
        data: fromEntity ? fromEntity<GetOneResponse>(entity) : entity,
      };
    }
  }

  Object.defineProperty(BaseGetOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseGetOneGateway;
}

export { GetOneGatewayMixin };
