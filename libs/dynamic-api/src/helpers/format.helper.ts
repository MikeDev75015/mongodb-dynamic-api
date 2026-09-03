import { camelCase, upperFirst } from './lodash.helper';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

/** @internal Not part of the public API. */
function getNamePrefix(routeType: RouteType, displayedName: string, version: string | undefined): string {
  return `${routeType}${displayedName}${version ? addVersionSuffix(version) : ''}`;
}

/** @internal Not part of the public API. */
function pascalCase(str?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

/** @internal Not part of the public API. */
function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

/** @internal Not part of the public API. */
function getDisplayedName(apiTag: string | undefined, entityName: string, subPath: string | undefined) {
  return pascalCase(`${subPath ? subPath + '-' : ''}${apiTag ?? entityName}`);
}

/** @internal Not part of the public API. */
function provideName(
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  suffix: 'Service' | 'Controller' | 'PoliciesGuard' | 'Gateway' | 'SocketPoliciesGuard',
) {
  return `${getNamePrefix(routeType, displayedName, version)}${suffix}`;
}

/** @internal Not part of the public API. */
function isEmptyObject(obj?: unknown): boolean {
  return obj ? typeof obj === 'object' && Object.keys(obj).length === 0 : true;
}

/** @internal Not part of the public API. */
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
