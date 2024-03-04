import { Delete, Get, Patch, Post, Put, Type } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { lowerCase, upperFirst, keys, lowerFirst } from 'lodash';
import { RouteType } from '../interfaces';
import { BaseEntity } from '../models';

class RouteDecoratorsBuilder<Entity extends BaseEntity> {
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
    private readonly version?: string,
    private readonly description?: string,
    private readonly param?: Type,
    private readonly query?: Type,
    private readonly body?: Type,
    private readonly presenter?: Type,
  ) {}

  public build() {
    const [paramKey] = this.param ? keys(new this.param()) : [];

    return [
      ...this.getRouteDecorators(paramKey),
      ...this.getApiDecorators(paramKey),
    ];
  }

  private getRouteDecorators(paramKey?: string) {
    switch (this.routeType) {
      case 'GetMany':
        return [Get()];
      case 'GetOne':
        return [Get(`:${paramKey}`)];
      case 'CreateMany':
        return [Post('many')];
      case 'CreateOne':
        return [Post()];
      case 'UpdateOne':
        return [Patch(`:${paramKey}`)];
      case 'ReplaceOne':
        return [Put(`:${paramKey}`)];
      case 'DuplicateMany':
        return [Post(`duplicate`)];
      case 'DuplicateOne':
        return [Post(`duplicate/:${paramKey}`)];
      case 'DeleteOne':
        return [Delete(`:${paramKey}`)];
      case 'DeleteMany':
        return [Delete()];
      default:
        throw new Error(
          `Unexpected route type! Cannot build route decorators. Received: ${this.routeType}`,
        );
    }
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
        type: this.presenter ?? this.entity,
        isArray: this.responseRouteTypeIsArray.includes(this.routeType),
      }),
      ...(this.body ? [ApiBody({
        type: this.body,
        required: !this.bodyRouteTypeIsOptional.includes(this.routeType),
      })] : []),
      ...(this.param && paramKey
        ? [
            ApiParam({
              type: typeof new this.param()[paramKey],
              name: paramKey,
            }),
          ]
        : []),
    ];
  }
}

export { RouteDecoratorsBuilder };
