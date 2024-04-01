import { camelCase, upperFirst } from 'lodash';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

export function pascalCase(str ?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

export function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

export function getFormattedApiTag<Entity>(apiTag: string | undefined, entityName: string) {
  return pascalCase(apiTag) ?? entityName;
}

export function getNamePrefix(routeType: RouteType, entityName: string, version: string | undefined): string {
  return `${routeType}${entityName}${addVersionSuffix(version)}`;
}
