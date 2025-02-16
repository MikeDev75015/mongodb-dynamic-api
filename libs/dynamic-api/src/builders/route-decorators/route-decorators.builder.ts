import { Delete, Get, Patch, Post, Put, Type } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { keys, lowerCase, lowerFirst, upperFirst } from 'lodash';
import { Public } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { pascalCase } from '../../helpers';
import { DynamicApiDecoratorBuilder, RouteType } from '../../interfaces';
import { BaseEntity } from '../../models';

class RouteDecoratorsBuilder<Entity extends BaseEntity> implements DynamicApiDecoratorBuilder<Entity> {
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
    private readonly subPath: string | undefined,
    private readonly version: string | undefined,
    private readonly description: string | undefined,
    private readonly isPublic: boolean | undefined,
    private readonly dTOs: {
      param?: Type;
      body?: Type;
      presenter?: Type;
    } = {},
    private readonly isArrayResponse: boolean = false,
  ) {}

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

    const subPath = this.subPath ?? '';

    const addSubPath = (before = true): string => {
      if (!this.subPath) {
        return '';
      }

      return before ? this.subPath + '/' : '/' + this.subPath;
    };

    switch (this.routeType) {
      case 'GetMany':
        routeDecorators.push(Get(subPath));
        break;
      case 'GetOne':
        routeDecorators.push(Get(`${addSubPath()}:${paramKey}`));
        break;
      case 'CreateMany':
        routeDecorators.push(Post(`many${addSubPath(false)}`));
        break;
      case 'CreateOne':
        routeDecorators.push(Post(subPath));
        break;
      case 'UpdateMany':
        routeDecorators.push(Patch(subPath));
        break;
      case 'UpdateOne':
        routeDecorators.push(Patch(`:${paramKey}${addSubPath(false)}`));
        break;
      case 'ReplaceOne':
        routeDecorators.push(Put(`:${paramKey}${addSubPath(false)}`));
        break;
      case 'DuplicateMany':
        routeDecorators.push(Post(`duplicate${addSubPath(false)}`));
        break;
      case 'DuplicateOne':
        routeDecorators.push(Post(`duplicate/:${paramKey}${addSubPath(false)}`));
        break;
      case 'DeleteMany':
        routeDecorators.push(Delete(subPath));
        break;
      case 'DeleteOne':
        routeDecorators.push(Delete(`:${paramKey}${addSubPath(false)}`));
        break;
      case 'Aggregate':
        routeDecorators.push(Get(subPath));
        break;
      default:
        throw new Error(
          `Unexpected route type! Cannot build route decorators. Received: ${this.routeType}`,
        );
    }

    return routeDecorators;
  }

  private getApiDecorators(paramKey?: string) {
    const feature = this.subPath ? `${pascalCase(this.subPath)}-${this.entity.name}` : this.entity.name;

    return [
      ApiOperation({
        operationId: `${lowerFirst(this.routeType)}${feature}${this.version ? 'V' + this.version : ''}`,
        summary:
          this.description ??
          `${upperFirst(lowerCase(this.routeType))} ${lowerCase(feature)}`,
      }),
      ApiResponse({
        type: this.dTOs.presenter ?? this.entity,
        isArray: this.responseRouteTypeIsArray.includes(this.routeType) || this.isArrayResponse,
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
