/**
 * Native replacements for lodash functions.
 * Same naming and signatures as lodash for easy migration.
 */

/**
 * Checks if value is empty.
 * Arrays, strings with a length of 0, null, undefined,
 * and objects with no own enumerable properties are considered empty.
 */
function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (Array.isArray(value) || typeof value === 'string') {
    return value.length === 0;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return true;
}

/**
 * Creates a deep clone of value using structuredClone (Node 17+).
 */
function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Creates an object composed of the picked object properties.
 */
function pick<T extends object>(obj: T, keys: (keyof T)[] | string[]): Partial<T> {
  const result = {} as Partial<T>;

  for (const key of keys) {
    if (key in obj) {
      (result as any)[key] = (obj as any)[key];
    }
  }

  return result;
}

/**
 * Splits a string into words, handling camelCase, PascalCase,
 * hyphens, underscores, and spaces.
 */
function splitWords(str: string): string[] {
  if (!str) {
    return [];
  }

  return str
    .replaceAll(/([a-z\d])([A-Z])/g, '$1 $2')
    .replaceAll(/(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')
    .replaceAll(/[^a-zA-Z\d\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Converts string to camelCase.
 */
function camelCase(str?: string): string {
  if (!str) {
    return '';
  }

  const words = splitWords(str);

  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('');
}

/**
 * Converts the first character of string to upper case.
 */
function upperFirst(str?: string): string {
  if (!str) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts string to kebab-case.
 */
function kebabCase(str?: string): string {
  if (!str) {
    return '';
  }

  return splitWords(str).map((w) => w.toLowerCase()).join('-');
}

/**
 * Converts string to lower case with spaces between words.
 */
function lowerCase(str?: string): string {
  if (!str) {
    return '';
  }

  return splitWords(str).map((w) => w.toLowerCase()).join(' ');
}

/**
 * Converts the first character of string to lower case.
 */
function lowerFirst(str?: string): string {
  if (!str) {
    return '';
  }

  return str.charAt(0).toLowerCase() + str.slice(1);
}

export { isEmpty, cloneDeep, pick, camelCase, upperFirst, lowerFirst, kebabCase, lowerCase };



