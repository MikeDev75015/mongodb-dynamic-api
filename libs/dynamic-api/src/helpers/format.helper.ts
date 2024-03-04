import { camelCase, upperFirst } from 'lodash';

export function pascalCase(str ?: string) {
    return str ? upperFirst(camelCase(str)) : undefined;
}

export function isValidVersion(version: string) {
    return /^\d+$/.test(version);
}
