import { Type, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { isEmpty } from 'lodash';
import { EntityParam } from '../../dtos';
import { DynamicAPIWsExceptionFilter } from '../../filters';
import { BaseGateway } from '../../gateways';
import { addVersionSuffix, getMixinData, provideName } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket, Mappable } from '../../interfaces';
import { EntityBodyMixin, EntityPresenterMixin } from '../../mixins';
import { BaseEntity } from '../../models';
import { DuplicateOneGateway, DuplicateOneGatewayConstructor } from './duplicate-one-gateway.interface';
import { DuplicateOneService } from './duplicate-one-service.interface';

function DuplicateOneGatewayMixin<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  { dTOs, ...routeConfig }: DynamicAPIRouteConfig<Entity>,
  version?: string,
): DuplicateOneGatewayConstructor<Entity> {
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

  class DuplicateOneData extends (
    dTOs?.body ?? EntityBodyMixin(entity, true)
  ) {}

  Object.defineProperty(DuplicateOneData, 'name', {
    value: `DuplicateOne${displayedName}${addVersionSuffix(version)}Data`,
    writable: false,
  });

  class DuplicateOneResponse extends (
    dTOs?.presenter ?? EntityPresenterMixin(entity)
  ) {}

  Object.defineProperty(DuplicateOneResponse, 'name', {
    value: dTOs?.presenter
      ? `DuplicateOne${displayedName}${addVersionSuffix(version)}Response`
      : `${displayedName}${addVersionSuffix(version)}Response`,
    writable: false,
  });

  class BaseDuplicateOneGateway extends BaseGateway<Entity> implements DuplicateOneGateway<Entity> {
    protected readonly entity = entity;

    constructor(
      protected readonly service: DuplicateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(jwtService);
    }

    @UseFilters(new DynamicAPIWsExceptionFilter())
    @SubscribeMessage(event)
    async duplicateOne(
      @ConnectedSocket() socket: ExtendedSocket<Entity>,
      @MessageBody() body: EntityParam & DuplicateOneData,
    ) {
      if (!body?.id) {
        throw new WsException('Invalid request body');
      }

      this.addUserToSocket(socket, isPublic);

      const { id, ...data } = body;

      const toEntity = (
        DuplicateOneData as Mappable<Entity>
      ).toEntity;

      const entity = await this.service.duplicateOne(
        id,
        !isEmpty(data) && toEntity ? toEntity(data) : data as Partial<Entity>,
      );

      const fromEntity = (
        DuplicateOneResponse as Mappable<Entity>
      ).fromEntity;

      return {
        event,
        data: fromEntity ? fromEntity<DuplicateOneResponse>(entity) : entity,
      };
    }
  }

  Object.defineProperty(BaseDuplicateOneGateway, 'name', {
    value: `Base${provideName(routeType, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return BaseDuplicateOneGateway;
}

export { DuplicateOneGatewayMixin };
