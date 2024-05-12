import { CustomDecorator } from '@nestjs/common';
import * as nestjsCommon from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { ApiEndpointVisibility } from './api-endpoint-visibility.decorator';

jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    applyDecorators: jest.fn(),
  };
});

describe('ApiEndpointVisibility', () => {
  let apiExcludeEndpointSpy: jest.SpyInstance;
  let applyDecoratorsSpy: jest.SpyInstance;

  const excluded = swagger.ApiExcludeEndpoint();

  beforeEach(() => {
    applyDecoratorsSpy = jest.spyOn(nestjsCommon, 'applyDecorators');
    apiExcludeEndpointSpy = jest.spyOn(swagger, 'ApiExcludeEndpoint').mockReturnValueOnce(excluded);
  });

  it('should return ApiExcludeEndpoint if condition is false', () => {
    const condition = false;
    ApiEndpointVisibility(condition);

    expect(apiExcludeEndpointSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledWith(excluded);
  });

  it('should not return the provided decorator if condition is false', () => {
    const condition = false;
    const decorator = jest.fn();
    ApiEndpointVisibility(condition, decorator);

    expect(apiExcludeEndpointSpy).toHaveBeenCalledTimes(1);
    expect(decorator).not.toHaveBeenCalled();
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledWith(excluded);
  });

  it('should not return ApiExcludeEndpoint if condition is true', () => {
    const condition = true;
    ApiEndpointVisibility(condition);

    expect(apiExcludeEndpointSpy).not.toHaveBeenCalled();
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).not.toHaveBeenCalledWith(excluded);
  });

  it('should return the provided decorator if condition is true', () => {
    const condition = true;
    const customDecorator = {} as CustomDecorator;
    const decorator = jest.fn().mockReturnValueOnce(customDecorator);
    ApiEndpointVisibility(condition, decorator());

    expect(apiExcludeEndpointSpy).not.toHaveBeenCalled();
    expect(applyDecoratorsSpy).toHaveBeenCalledTimes(1);
    expect(applyDecoratorsSpy).toHaveBeenCalledWith(customDecorator);
  });
});
