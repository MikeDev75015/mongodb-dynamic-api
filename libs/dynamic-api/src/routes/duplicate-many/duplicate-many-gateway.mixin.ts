import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { ManyEntityQuery } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters/ws-exception/dynamic-api-ws-exception.filter';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateManyGateway, DuplicateManyGatewayConstructor } from './duplicate-many-gateway.interface';
import { DuplicateManyService } from './duplicate-many-service.interface';

function DuplicateManyGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateManyGatewayConstructor<Entity> {
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

  class DuplicateManyData extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(DuplicateManyData, 'name', {
    value: `DuplicateMany${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class DuplicateManyResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(DuplicateManyResponse, 'name', {
    value: dTOs?.presenter
      ? `DuplicateMany${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseDuplicateManyGateway extends BaseGateway<Entity> implements DuplicateManyGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async duplicateMany(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: ManyEntityQuery & DuplicateManyData,
    ) {
      if (!this.isValidManyBody(body)) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { ids, ...data } = body;

      const toEntity = (
        DuplicateManyData as Mappable<Entity>
      ).toEntity;

      const list = await this.service.duplicateMany(
        ids,
        !isEmpty(data) && toEntity ? toEntity(data) : data as Partial<Entity>,
      );

      const fromEntities = (
        DuplicateManyResponse as Mappable<Entity>
      ).fromEntities;

      return {
        event,
        data: fromEntities ? fromEntities<DuplicateManyResponse>(list) : list,
      };
    }
  }

  Object.defineProperty(BaseDuplicateManyGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDuplicateManyGateway;
}

export { DuplicateManyGatewayMixin };
