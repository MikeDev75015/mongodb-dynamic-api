import { camelCase, upperFirst } from 'lodash';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

function getNamePrefix(routeType: RouteType, entityName: string, version: string | undefined): string {
  return `${routeType}${entityName}${addVersionSuffix(version)}`;
}

function pascalCase(str?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

function getFormattedApiTag(apiTag: string | undefined, entityName: string) {
  return pascalCase(apiTag) ?? entityName;
}

function provideName(
  routeType: RouteType,
  entityName: string,
  version: string | undefined,
  suffix: 'Service' | 'Controller' | 'PoliciesGuard' | 'Gateway',
) {
  return `${getNamePrefix(routeType, entityName, version)}${suffix}`;
}

function isEmptyObject(obj?: unknown): boolean {
  return obj ? typeof obj === 'object' && Object.keys(obj).length === 0 : true;
}

function isNotEmptyObject(obj?: unknown): boolean {
  return !isEmptyObject(obj);
}

export  {
  pascalCase,
  isValidVersion,
  getFormattedApiTag,
  provideName,
  isEmptyObject,
  isNotEmptyObject,
}
