import * as NestjsCommon from '@nestjs/common';
import * as SwaggerAPIDecorators from '@nestjs/swagger';
import * as CustomDecorators from '../../decorators';
import * as Modules from '../../modules';
import { AuthDecoratorsBuilder } from './auth-decorators.builder';

jest.mock('@nestjs/common', () => {
  return {
    ...jest.requireActual('@nestjs/common'),
    UseGuards: jest.fn(() => jest.fn()),
  };
});
jest.mock('@nestjs/swagger', () => {
  return {
    ...jest.requireActual('@nestjs/swagger'),
    ApiBearerAuth: jest.fn(() => jest.fn()),
  };

});
jest.mock('../../decorators');
jest.mock('../../modules');

describe('AuthDecoratorsBuilder', () => {
  let publicDecoratorSpy: jest.SpyInstance;
  let apiBearerAuthDecoratorSpy: jest.SpyInstance;
  let useGuardsSpy: jest.SpyInstance;

  class FakeAuthRegisterPoliciesGuard {}

  beforeEach(() => {
    publicDecoratorSpy = jest.spyOn(CustomDecorators, 'Public');
    apiBearerAuthDecoratorSpy = jest.spyOn(SwaggerAPIDecorators, 'ApiBearerAuth');
    useGuardsSpy = jest.spyOn(NestjsCommon, 'UseGuards');
  });

  describe('build', () => {
    it('should return Public route decorator if route is public', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(undefined, FakeAuthRegisterPoliciesGuard);
      authDecoratorsBuilder.build();

      expect(publicDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(apiBearerAuthDecoratorSpy).not.toHaveBeenCalled();
      expect(useGuardsSpy).toHaveBeenCalledWith(FakeAuthRegisterPoliciesGuard);
    });

    it('should return ApiBearerAuth route decorator if route is protected', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(true, FakeAuthRegisterPoliciesGuard);
      authDecoratorsBuilder.build();

      expect(apiBearerAuthDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(publicDecoratorSpy).not.toHaveBeenCalled();
      expect(useGuardsSpy).toHaveBeenCalledWith(Modules.JwtAuthGuard, FakeAuthRegisterPoliciesGuard);

    });
  });
});
