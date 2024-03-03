import { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';

export async function initApp(metadata: ModuleMetadata = {}) {
  const moduleRef = await Test.createTestingModule(metadata).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return app;
}

export async function closeApp(app) {
  await app.close();
}
