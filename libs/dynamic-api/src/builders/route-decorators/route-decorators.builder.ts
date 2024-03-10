import { Delete, Get, Patch, Post, Put, Type } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { keys, lowerCase, lowerFirst, upperFirst } from 'lodash';
import { Public } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DecoratorBuilder, RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';

class RouteDecoratorsBuilder<Entity extends BaseEntity> implements DecoratorBuilder<Entity> {
  private readonly responseRouteTypeIsArray: RouteType[] = [
    'GetMany',
    'CreateMany',
    'DuplicateMany',
  ];

  private readonly bodyRouteTypeIsOptional: RouteType[] = [
    'DuplicateOne',
    'DuplicateMany',
  ];

  constructor(
    private readonly routeType: RouteType,
    private readonly entity: Type<Entity>,
    private readonly version: string | undefined,
    private readonly description: string | undefined,
    private readonly isPublic: boolean | undefined,
    private readonly dTOs: {
      param?: Type;
      query?: Type;
      body?: Type;
      presenter?: Type;
    } = {},
  ) {
  }

  public build() {
    const [paramKey] = this.dTOs.param ? keys(new this.dTOs.param()) : [];

    return [
      ...this.getRouteDecorators(paramKey),
      ...this.getApiDecorators(paramKey),
    ];
  }

  private getRouteDecorators(paramKey?: string) {
    let routeDecorators: any[] = [];
    const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

    if (this.isPublic) {
      routeDecorators.push(Public());
    } else if (isAuthEnabled) {
      routeDecorators.push(ApiBearerAuth());
    }

    switch (this.routeType) {
      case 'GetMany':
        routeDecorators.push(Get());
        break;
      case 'GetOne':
        routeDecorators.push(Get(`:${paramKey}`));
        break;
      case 'CreateMany':
        routeDecorators.push(Post('many'));
        break;
      case 'CreateOne':
        routeDecorators.push(Post());
        break;
      case 'UpdateMany':
        routeDecorators.push(Patch());
        break;
      case 'UpdateOne':
        routeDecorators.push(Patch(`:${paramKey}`));
        break;
      case 'ReplaceOne':
        routeDecorators.push(Put(`:${paramKey}`));
        break;
      case 'DuplicateMany':
        routeDecorators.push(Post(`duplicate`));
        break;
      case 'DuplicateOne':
        routeDecorators.push(Post(`duplicate/:${paramKey}`));
        break;
      case 'DeleteMany':
        routeDecorators.push(Delete());
        break;
      case 'DeleteOne':
        routeDecorators.push(Delete(`:${paramKey}`));
        break;
      default:
        throw new Error(
          `Unexpected route type! Cannot build route decorators. Received: ${this.routeType}`,
        );
    }

    return routeDecorators;
  }

  private getApiDecorators(paramKey?: string) {
    return [
      ApiOperation({
        operationId: `${lowerFirst(this.routeType)}${this.entity.name}${this.version ? 'V' + this.version : ''}`,
        summary:
          this.description ??
          `${upperFirst(lowerCase(this.routeType))} ${lowerCase(this.entity.name)}`,
      }),
      ApiResponse({
        type: this.dTOs.presenter ?? this.entity,
        isArray: this.responseRouteTypeIsArray.includes(this.routeType),
      }),
      ...(
        this.dTOs.body ? [
          ApiBody({
            type: this.dTOs.body,
            required: !this.bodyRouteTypeIsOptional.includes(this.routeType),
          }),
        ] : []
      ),
      ...(
        this.dTOs.param && paramKey
          ? [
            ApiParam({
              type: typeof new this.dTOs.param()[paramKey],
              name: paramKey,
            }),
          ]
          : []
      ),
    ];
  }
}

export { RouteDecoratorsBuilder };
