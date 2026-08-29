import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as SwaggerAPIDecorators from '@nestjs/swagger';
import * as CustomDecorators from '../../decorators';
import { AuthDecoratorsBuilder } from './auth-decorators.builder';

vi.mock('@nestjs/common', async () => {
  return {
    ...(await vi.importActual('@nestjs/common')),
    UseGuards: vi.fn(() => vi.fn()),
  };
});
vi.mock('@nestjs/swagger', async () => {
  return {
    ...(await vi.importActual('@nestjs/swagger')),
    ApiBearerAuth: vi.fn(() => vi.fn()),
  };

});
vi.mock('../../decorators');

describe('AuthDecoratorsBuilder', () => {
  let publicDecoratorSpy: Mock;
  let apiBearerAuthDecoratorSpy: Mock;

  class FakeAuthRegisterPoliciesGuard {}

  beforeEach(() => {
    publicDecoratorSpy = vi.spyOn(CustomDecorators, 'Public');
    apiBearerAuthDecoratorSpy = vi.spyOn(SwaggerAPIDecorators, 'ApiBearerAuth');
  });

  describe('build', () => {
    it('should return Public route decorator if route is public', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(undefined, FakeAuthRegisterPoliciesGuard);
      authDecoratorsBuilder.build();

      expect(publicDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(apiBearerAuthDecoratorSpy).not.toHaveBeenCalled();
    });

    it('should return ApiBearerAuth route decorator if route is protected', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(true, undefined);
      authDecoratorsBuilder.build();

      expect(apiBearerAuthDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(publicDecoratorSpy).not.toHaveBeenCalled();

    });

    it('should return ApiBearerAuth with guards if protected', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(true, FakeAuthRegisterPoliciesGuard);
      authDecoratorsBuilder.build();

      expect(apiBearerAuthDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(publicDecoratorSpy).not.toHaveBeenCalled();

    });
  });
});
