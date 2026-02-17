import { CustomDecorator } from '@nestjs/common';
import * as nestjsCommon from '@nestjs/common';
import { ApiEndpointVisibility } from './api-endpoint-visibility.decorator';

jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    applyDecorators: jest.fn(),
  };
});

describe('ApiEndpointVisibility', () => {
  let applyDecoratorsSpy: jest.SpyInstance;

  beforeEach(() => {
    applyDecoratorsSpy = jest.spyOn(nestjsCommon, 'applyDecorators');
  });

  it('should return ApiExcludeEndpoint if condition is false', () => {
    const condition = false;
    ApiEndpointVisibility(condition);
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(typeof applyDecoratorsSpy.mock.calls[0][0]).toBe('function');
  });

  it('should not return the provided decorator if condition is false', () => {
    const condition = false;
    const decorator = jest.fn();
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
    const decorator = jest.fn().mockReturnValueOnce(customDecorator);
    ApiEndpointVisibility(condition, decorator());
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledWith(customDecorator);
  });
});
