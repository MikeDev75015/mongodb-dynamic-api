import { vi } from 'vitest';
import type { Mocked } from 'vitest';

/**
 * In-house replacement for `@golevelup/ts-jest`'s `createMock` — same recursive-proxy algorithm
 * (ported from `@golevelup/ts-jest/lib/mocks.js`), `vi.fn()` instead of `jest.fn()` from
 * `@jest/globals`, which `@golevelup/ts-jest` hard-imports and is therefore incompatible with
 * Vitest. Same call signature (`createMock<T>(partial?, options?)`), same runtime behavior — the
 * migration codemod only needs to swap the import, no call-site changes.
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : unknown extends T[P]
        ? T[P]
        : DeepPartial<T[P]>;
};

export type PartialFuncReturn<T> = {
  [K in keyof T]?: T[K] extends (...args: infer A) => infer U
    ? (...args: A) => PartialFuncReturn<U>
    : DeepPartial<T[K]>;
};

export type MockOptions = {
  name?: string;
};

type UnknownRecord = Record<PropertyKey, unknown>;

const createRecursiveMockProxy = (name: string): unknown => {
  const cache = new Map<PropertyKey, unknown>();

  const proxy: UnknownRecord = new Proxy({} as UnknownRecord, {
    get: (target, prop) => {
      if (cache.has(prop)) {
        return cache.get(prop);
      }

      const propName = prop.toString();
      const checkProp = target[prop];
      const mockedProp =
        prop in target
          ? typeof checkProp === 'function'
            ? vi.fn()
            : checkProp
          : propName === 'then'
            ? undefined
            : createRecursiveMockProxy(propName);

      cache.set(prop, mockedProp);
      return mockedProp;
    },
  });

  return vi.fn(() => proxy);
};

export const createMock = <T extends object>(
  partial: PartialFuncReturn<T> = {} as PartialFuncReturn<T>,
  options: MockOptions = {},
): Mocked<T> => {
  const cache = new Map<PropertyKey, unknown>();
  const { name = 'mock' } = options;

  const proxy = new Proxy(partial as UnknownRecord, {
    get: (target, prop) => {
      if (
        prop === 'inspect' ||
        prop === 'then' ||
        (typeof prop === 'symbol' && prop.toString() === 'Symbol(util.inspect.custom)')
      ) {
        return undefined;
      }

      if (cache.has(prop)) {
        return cache.get(prop);
      }

      const checkProp = target[prop];
      let mockedProp: unknown;

      if (prop in target) {
        mockedProp = typeof checkProp === 'function' ? vi.fn(checkProp as (...args: unknown[]) => unknown) : checkProp;
      } else if (prop === 'constructor') {
        mockedProp = () => undefined;
      } else {
        mockedProp = createRecursiveMockProxy(`${name}.${prop.toString()}`);
      }

      cache.set(prop, mockedProp);
      return mockedProp;
    },
  });

  return proxy as unknown as Mocked<T>;
};
