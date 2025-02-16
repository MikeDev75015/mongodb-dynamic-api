import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { UpdateManyGateway, UpdateManyGatewayConstructor } from './update-many-gateway.interface';
import { UpdateManyService } from './update-many-service.interface';

function UpdateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): UpdateManyGatewayConstructor<Entity> {
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

  class UpdateManyData extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(UpdateManyData, 'name', {
    value: `UpdateMany${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class UpdateManyResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(UpdateManyResponse, 'name', {
    value: dTOs?.presenter
      ? `UpdateMany${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseUpdateManyGateway extends BaseGateway<Entity> implements UpdateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: UpdateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async updateMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery & UpdateManyData,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { ids, ...data } = body;

      if (isEmpty(data)) {
        throw new WsException('Invalid request body');
      }

      const toEntity = (
        UpdateManyData as Mappable<Entity>
      ).toEntity;

      const list = await this.service.updateMany(ids, toEntity ? toEntity(data) : data as Partial<Entity>);

      const fromEntities = (
        UpdateManyResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities<UpdateManyResponse>(list) : list,
      };
    }
  }

  Object.defineProperty(BaseUpdateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseUpdateManyGateway;
}

export { UpdateManyGatewayMixin };
