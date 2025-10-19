import { Type, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { DeletePresenter, ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { JwtSocketGuard } from '../../guards';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { SocketPoliciesGuardMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DeleteManyGateway, DeleteManyGatewayConstructor } from './delete-many-gateway.interface';
import { DeleteManyService } from './delete-many-service.interface';

function DeleteManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, useInterceptors = [], ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DeleteManyGatewayConstructor<Entity> {
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

  class DeleteManyResponse extends (dTOs?.presenter ?? DeletePresenter) {}

  Object.defineProperty(DeleteManyResponse, 'name', {
    value: dTOs?.presenter
      ? `DeleteMany${displayedName}${addVersionSuffix(version)}Response`
      : `DeleteResultResponse`,
    writable: false,
  });

  class DeleteManyPoliciesGuard extends SocketPoliciesGuardMixin(
    entity,
    routeType,
    event,
    version,
    abilityPredicate,
    isPublic,
  ) {}

  class BaseDeleteManyGateway extends BaseGateway<Entity> implements DeleteManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DeleteManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @UseGuards(new JwtSocketGuard(isPublic), DeleteManyPoliciesGuard)
    @UseInterceptors(...useInterceptors)
    @SubscribeMessage(event)
    async deleteMany(
      @ConnectedSocket() _socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      const deleteResult = await this.service.deleteMany(body.ids);

      const fromDeleteResult = (
        DeleteManyResponse as Mappable<Entity>
      ).fromDeleteResult;

      return {
        event,
        data: fromDeleteResult ? fromDeleteResult<DeleteManyResponse>(deleteResult) : deleteResult,
      };
    }
  }

  Object.defineProperty(BaseDeleteManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDeleteManyGateway;
}

export { DeleteManyGatewayMixin };
