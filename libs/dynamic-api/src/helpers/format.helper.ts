import { camelCase, upperFirst } from './lodash.helper';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

/** @deprecated Internal API — will be removed from public exports in v5. */
function getNamePrefix(routeType: RouteType, displayedName: string, version: string | undefined): string {
  return `${routeType}${displayedName}${version ? addVersionSuffix(version) : ''}`;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function pascalCase(str?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function getDisplayedName(apiTag: string | undefined, entityName: string, subPath: string | undefined) {
  return pascalCase(`${subPath ? subPath + '-' : ''}${apiTag ?? entityName}`);
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function provideName(
  routeType: RouteType,
  displayedName: string,
  version: string | undefined,
  suffix: 'Service' | 'Controller' | 'PoliciesGuard' | 'Gateway' | 'SocketPoliciesGuard',
) {
  return `${getNamePrefix(routeType, displayedName, version)}${suffix}`;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
function isEmptyObject(obj?: unknown): boolean {
  return obj ? typeof obj === 'object' && Object.keys(obj).length === 0 : true;
}

/** @deprecated Internal API — will be removed from public exports in v5. */
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
