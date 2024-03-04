import { lowerCase } from 'lodash';
import { RouteType } from '../interfaces';

function getDefaultRouteDescription(routeType: RouteType, entityName: string): string {
  const contentName = lowerCase(entityName);

  switch (routeType) {
    case 'CreateMany':
      return `Create many ${contentName}`;
    case 'CreateOne':
      return `Create one ${contentName}`;
    case 'DeleteMany':
      return `Delete many ${contentName}`;
    case 'DeleteOne':
      return `Delete one ${contentName}`;
    case 'DuplicateOne':
      return `Duplicate one ${contentName}`;
    case 'GetMany':
      return `Get many ${contentName}`;
    case 'GetOne':
      return `Get one ${contentName} by id`;
    case 'ReplaceOne':
      return `Replace one ${contentName}`;
    case 'UpdateOne':
      return `Update one ${contentName}`;
    default:
      throw new Error(`Route type "${routeType}" is not supported`);
  }
}

export { getDefaultRouteDescription };