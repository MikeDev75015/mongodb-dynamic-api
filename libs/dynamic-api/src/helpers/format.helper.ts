import { camelCase, upperFirst } from 'lodash';

export function pascalCase(str ?: string) {
    return str ? upperFirst(camelCase(str)) : undefined;
}
