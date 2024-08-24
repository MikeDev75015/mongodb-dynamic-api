import { camelCase, upperFirst } from 'lodash';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

function getNamePrefix(routeType: RouteType, displayedName: string, version: string | undefined): string {
  return `${routeType}${displayedName}${addVersionSuffix(version)}`;
}

function pascalCase(str?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

function getDisplayedName(apiTag: string | undefined, entityName: string, subPath: string | undefined) {
  return pascalCase(`${subPath ? subPath + '-' : ''}${apiTag ?? entityName}`);
}

function provideName(
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  suffix: 'Service' | 'Controller' | 'PoliciesGuard' | 'Gateway',
) {
  return `${getNamePrefix(routeType, displayedName, version)}${suffix}`;
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
  getDisplayedName,
  provideName,
  isEmptyObject,
  isNotEmptyObject,
}
