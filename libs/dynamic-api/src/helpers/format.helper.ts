import { camelCase, upperFirst } from 'lodash';
import { RouteType } from '../interfaces';
import { addVersionSuffix } from './versioning-config.helper';

export function pascalCase(str?: string) {
  return str ? upperFirst(camelCase(str)) : undefined;
}

export function isValidVersion(version: string) {
  return /^\d+$/.test(version);
}

export function getFormattedApiTag(apiTag: string | undefined, entityName: string) {
  return pascalCase(apiTag) ?? entityName;
}

function getNamePrefix(routeType: RouteType, entityName: string, version: string | undefined): string {
  return `${routeType}${entityName}${addVersionSuffix(version)}`;
}

export function provideName(
  routeType: RouteType,
  entityName: string,
  version: string | undefined,
  suffix: 'Service' | 'Controller' | 'PoliciesGuard',
) {
  return `${getNamePrefix(routeType, entityName, version)}${suffix}`;
}
