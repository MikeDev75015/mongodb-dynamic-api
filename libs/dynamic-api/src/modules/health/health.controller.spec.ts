import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException, Type } from '@nestjs/common';
import { Connection } from 'mongoose';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { createHealthController } from './health.controller';

describe('createHealthController', () => {
  let HealthController: Type;
  let connection: Connection;

  const buildController = (readyState: number) => {
    connection = { readyState } as Connection;
    HealthController = createHealthController('dynamic-api-connection', 'health');
    return new HealthController(connection) as { check: () => Promise<unknown> };
  };

  it('should set the controller path to the given path', () => {
    HealthController = createHealthController('dynamic-api-connection', 'healthz');

    expect(Reflect.getMetadata('path', HealthController)).toBe('healthz');
  });

  it('should mark the route as public', () => {
    HealthController = createHealthController('dynamic-api-connection', 'health');

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check)).toBe(true);
  });

  it('should return { status: "ok", mongo: "up" } when the connection is ready (readyState 1)', async () => {
    const controller = buildController(1);

    await expect(controller.check()).resolves.toStrictEqual({ status: 'ok', mongo: 'up' });
  });

  it.each([0, 2, 3])('should throw ServiceUnavailableException when readyState is %i', async (readyState) => {
    const controller = buildController(readyState);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.check()).rejects.toMatchObject({
      response: { status: 'error', mongo: 'down' },
    });
  });
});
