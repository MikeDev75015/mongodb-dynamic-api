import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import {
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  ExtendedSocket,
  GatewayResponse,
  Mappable,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyBodyMixin } from './create-many-body.mixin';
import { CreateManyGateway, CreateManyGatewayConstructor } from './create-many-gateway.interface';
import { CreateManyPresenterMixin } from './create-many-presenter.mixin';
import { CreateManyService } from './create-many-service.interface';

function CreateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): CreateManyGatewayConstructor<Entity> {
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

  class CreateManyData extends CreateManyBodyMixin(entity, dTOs?.body) {}

  Object.defineProperty(CreateManyData, 'name', {
    value: `${routeType}${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class CreateManyResponse extends CreateManyPresenterMixin(entity, dTOs?.presenter) {}

  Object.defineProperty(CreateManyResponse, 'name', {
    value: dTOs?.presenter
      ? `${routeType}${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseCreateManyGateway extends BaseGateway<Entity> implements CreateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: CreateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async createMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: CreateManyData,
    ): GatewayResponse<CreateManyResponse[]> {
      if (!(
        'list' in body &&
        Array.isArray(body.list) &&
        body.list.length &&
        body.list.every((e: object) => !isEmpty(e))
      )) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      let toCreateList = body.list as Partial<Entity>[];

      const toEntities = (
        CreateManyData as Mappable<Entity>
      ).toEntities;

      const list = await this.service.createMany(toEntities ? toEntities(body) : toCreateList);

      const fromEntities = (
        CreateManyResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities(list) : list,
      };
    }
  }

  Object.defineProperty(BaseCreateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseCreateManyGateway;
}

export { CreateManyGatewayMixin };
