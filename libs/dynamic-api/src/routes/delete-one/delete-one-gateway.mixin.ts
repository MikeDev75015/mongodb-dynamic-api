import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { DeletePresenter, EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneGateway, DeleteOneGatewayConstructor } from './delete-one-gateway.interface';
import { DeleteOneService } from './delete-one-service.interface';

function DeleteOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteOneGatewayConstructor<Entity> {
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

  class DeleteOneResponse extends (
    dTOs?.presenter ?? DeletePresenter
  ) {}

  Object.defineProperty(DeleteOneResponse, 'name', {
    value: dTOs?.presenter
      ? `DeleteOne${displayedName}${addVersionSuffix(version)}Response`
      : `DeleteResultResponse`,
    writable: false,
  });

  class BaseDeleteOneGateway extends BaseGateway<Entity> implements DeleteOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DeleteOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async deleteOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam,
    ) {
      if (!body?.id) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const deleteResult = await this.service.deleteOne(body.id);

      const fromDeleteResult = (
        DeleteOneResponse as Mappable<Entity>
      ).fromDeleteResult;

      return {
        event,
        data: fromDeleteResult ? fromDeleteResult<DeleteOneResponse>(deleteResult) : deleteResult,
      };
    }
  }

  Object.defineProperty(BaseDeleteOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDeleteOneGateway;
}

export { DeleteOneGatewayMixin };
