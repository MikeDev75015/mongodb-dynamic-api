import * as supertest from 'supertest';
import mongoose from 'mongoose';
import { DynamicApiModule } from '../../src';
import { closeTestingApp } from '../e2e.setup';
import 'dotenv/config';
import { createUserWithRefreshTokenEntity, initModule } from '../shared';

describe('DynamicApiModule forRoot - Cookie mode (useCookie: true) (e2e)', () => {
  let agent: ReturnType<typeof supertest.agent>;
  let accessToken: string;

  beforeEach(() => {
    DynamicApiModule.state['resetState']();
  });

  afterEach(async () => {
    await closeTestingApp(mongoose.connections);
  });

  beforeEach(async () => {
    const User = createUserWithRefreshTokenEntity();
    await initModule({
      useAuth: {
        userEntity: User,
        jwt: {
          secret: 'secret',
          expiresIn: '15m',
          refreshTokenExpiresIn: '7d',
        },
        refreshToken: {
          useCookie: true,
          refreshTokenField: 'refreshTokenHash',
        },
      },
    });

    agent = supertest.agent(global.app.getHttpServer());

    await agent
      .post('/auth/register')
      .send({ email: 'cookie@test.co', password: 'test' })
      .set('Content-Type', 'application/json');

    const loginRes = await agent
      .post('/auth/login')
      .send({ email: 'cookie@test.co', password: 'test' })
      .set('Content-Type', 'application/json');

    accessToken = loginRes.body.accessToken;
  });

  it('should set httpOnly refreshToken cookie on login and not expose it in body', async () => {
    const res = await agent
      .post('/auth/login')
      .send({ email: 'cookie@test.co', password: 'test' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: expect.any(String) });
    expect(res.body.refreshToken).toBeUndefined();

    const setCookieHeader = res.headers['set-cookie'] as string[];
    expect(setCookieHeader).toBeDefined();
    const refreshCookie = (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
      .find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('should refresh using cookie (no Bearer needed)', async () => {
    const res = await agent
      .post('/auth/refresh-token')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: expect.any(String) });
    expect(res.body.refreshToken).toBeUndefined();

    const setCookieHeader = res.headers['set-cookie'] as string[];
    const refreshCookie = (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
      .find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
  });

  it('should return 401 on refresh without cookie', async () => {
    // New agent with no cookie jar
    const freshAgent = supertest.agent(global.app.getHttpServer());
    const res = await freshAgent
      .post('/auth/refresh-token')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
  });

  it('should reject Bearer token on refresh-token endpoint when useCookie is true', async () => {
    const freshAgent = supertest.agent(global.app.getHttpServer());
    const { body: loginBody } = await agent
      .post('/auth/login')
      .send({ email: 'cookie@test.co', password: 'test' })
      .set('Content-Type', 'application/json');

    // accessToken passed as Bearer - should fail (cookie extractor only)
    const res = await freshAgent
      .post('/auth/refresh-token')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
  });

  it('should clear cookie and return 204 on logout', async () => {
    const res = await agent
      .post('/auth/logout')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(204);

    const setCookieHeader = res.headers['set-cookie'] as string[];
    const refreshCookie = (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
      .find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('should reject refresh after logout (cookie cleared + DB hash cleared)', async () => {
    await agent.post('/auth/logout').set('Content-Type', 'application/json');

    const res = await agent
      .post('/auth/refresh-token')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
  });
});

