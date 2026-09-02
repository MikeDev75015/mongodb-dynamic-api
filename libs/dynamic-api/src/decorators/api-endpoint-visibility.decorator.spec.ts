import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { CustomDecorator } from '@nestjs/common';
import * as nestjsCommon from '@nestjs/common';
import { ApiEndpointVisibility } from './api-endpoint-visibility.decorator';

vi.mock('@nestjs/common', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...originalModule,
    applyDecorators: vi.fn(),
  };
});

describe('ApiEndpointVisibility', () => {
  let applyDecoratorsSpy: Mock;

  beforeEach(() => {
    applyDecoratorsSpy = vi.spyOn(nestjsCommon, 'applyDecorators');
  });

  it('should return ApiExcludeEndpoint if condition is false', () => {
    const condition = false;
    ApiEndpointVisibility(condition);
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(typeof applyDecoratorsSpy.mock.calls[0][0]).toBe('function');
  });

  it('should not return the provided decorator if condition is false', () => {
    const condition = false;
    const decorator = vi.fn();
    ApiEndpointVisibility(condition, decorator);
    expect(decorator).not.toHaveBeenCalled();
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(typeof applyDecoratorsSpy.mock.calls[0][0]).toBe('function');
  });

  it('should not return ApiExcludeEndpoint if condition is true', () => {
    const condition = true;
    ApiEndpointVisibility(condition);
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy.mock.calls[0][0]).toBeDefined();
  });

  it('should return the provided decorator if condition is true', () => {
    const condition = true;
    const customDecorator = {} as CustomDecorator;
    const decorator = vi.fn().mockReturnValueOnce(customDecorator);
    ApiEndpointVisibility(condition, decorator());
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledWith(customDecorator);
  });
});
