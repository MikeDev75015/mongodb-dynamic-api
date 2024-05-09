import { TestingModule } from '@nestjs/testing';

export async function createTestingApp(
  moduleRef: TestingModule,
  initMainCb?: (app: any) => Promise<void>,
) {
  global.app = moduleRef.createNestApplication();

  if (initMainCb) {
    await initMainCb(global.app);
  }

  return global.app.init();
}

const verifyApp = () => {
  if (!global.app) {
    throw new Error('App is not initialized');
  }
};

export async function closeTestingApp(): Promise<void> {
  if (!global.app) {
    return;
  }

  await global.app.close();
}

export const server = {
  get: async (path: string): Promise<any> => {
    verifyApp();
    return await global.app.getHttpServer()({
      method: 'GET',
      url: path,
    });
  },
  post: async (path: string, body: any): Promise<any> => {
    verifyApp();
    return await global.app.getHttpServer()({
      method: 'POST',
      url: path,
      payload: body,
    });
  },
  patch: async (path: string, body: any): Promise<any> => {
    verifyApp();
    return await global.app.getHttpServer()({
      method: 'PATCH',
      url: path,
      payload: body,
    });
  },
  put: async (path: string, body: any): Promise<any> => {
    verifyApp();
    return await global.app.getHttpServer()({
      method: 'PUT',
      url: path,
      payload: body,
    });
  },
  delete: async (path: string): Promise<any> => {
    verifyApp();
    return await global.app.getHttpServer()({
      method: 'DELETE',
      url: path,
    });
  },
};
