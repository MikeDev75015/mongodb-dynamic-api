import { describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { DynamicApiModule } from '../dynamic-api.module';
import { createDynamicApiTestingApp } from './create-dynamic-api-testing-app';

vi.mock('@nestjs/testing', () => ({
  Test: { createTestingModule: vi.fn() },
}));

vi.mock('../dynamic-api.module', () => ({
  DynamicApiModule: { forRoot: vi.fn() },
}));

// Simulates the optional "mongodb-memory-server" package not being installed at all.
// No `{ virtual: true }` here: the package IS installed (as this repo's own devDependency,
// to exercise the happy path elsewhere) — virtual would tell Jest the module doesn't exist on
// disk, which is false and made this mock unreliable across files in a full-suite run.
vi.mock('mongodb-memory-server', () => {
  throw new Error("Cannot find module 'mongodb-memory-server'");
});

describe('createDynamicApiTestingApp — mongodb-memory-server not installed', () => {
  it('throws an actionable error instead of an opaque module-not-found error', async () => {
    await expect(createDynamicApiTestingApp()).rejects.toThrow(
      '[DynamicAPI] createDynamicApiTestingApp: no `uri` was provided, so an in-memory MongoDB '
      + 'is needed, which requires the optional "mongodb-memory-server" package. '
      + 'Install it with: npm install --save-dev mongodb-memory-server — or pass your own `uri`.',
    );
  });

  it('never attempts to build the testing module', async () => {
    await expect(createDynamicApiTestingApp()).rejects.toThrow();

    expect(Test.createTestingModule).not.toHaveBeenCalled();
    expect(DynamicApiModule.forRoot).not.toHaveBeenCalled();
  });
});
