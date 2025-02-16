import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { CreateOneGateway, CreateOneGatewayConstructor } from './create-one-gateway.interface';
import { CreateOneService } from './create-one-service.interface';

function CreateOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateOneGatewayConstructor<Entity> {
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

  class CreateOneData extends (dTOs?.body ?? EntityBodyMixin(entity)) {}

  Object.defineProperty(CreateOneData, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class CreateOneResponse extends (dTOs?.presenter ?? EntityPresenterMixin(entity)) {}

  Object.defineProperty(CreateOneResponse, 'name', {
    value: dTOs?.presenter
      ? `CreateOne${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseCreateOneGateway extends BaseGateway<Entity> implements CreateOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async createOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: CreateOneData,
    ) {
      if (isEmpty(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const toEntity = (
        CreateOneData as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.createOne(toEntity ? toEntity(body) : body as Partial<Entity>);

      const fromEntity = (
        CreateOneResponse as Mappable<Entity>
      ).fromEntity;

      return {
        event,
        data: fromEntity ? fromEntity<CreateOneResponse>(entity) : entity,
      };
    }
  }

  Object.defineProperty(BaseCreateOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseCreateOneGateway;
}

export { CreateOneGatewayMixin };
