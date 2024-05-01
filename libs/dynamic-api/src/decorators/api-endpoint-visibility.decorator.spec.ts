import * as swagger from '@nestjs/swagger';
import { ApiEndpointVisibility } from './api-endpoint-visibility.decorator';

describe('ApiEndpointVisibility', () => {
  let apiExcludeEndpointSpy: jest.SpyInstance;

  beforeEach(() => {
    apiExcludeEndpointSpy = jest.spyOn(swagger, 'ApiExcludeEndpoint');
  });

  it('should return ApiExcludeEndpoint if condition is false', () => {
    const condition = false;
    ApiEndpointVisibility(condition);
    expect(apiExcludeEndpointSpy).toHaveBeenCalledTimes(1);
  });

  it('should not return ApiExcludeEndpoint if condition is true', () => {
    const condition = true;
    ApiEndpointVisibility(condition);
    expect(apiExcludeEndpointSpy).not.toHaveBeenCalled();
  });

  it('should return the provided decorator if condition is true', () => {
    const condition = true;
    const decorator = jest.fn();
    ApiEndpointVisibility(condition, decorator());
    expect(apiExcludeEndpointSpy).not.toHaveBeenCalled();
    expect(decorator).toHaveBeenCalledTimes(1);
  });
});
