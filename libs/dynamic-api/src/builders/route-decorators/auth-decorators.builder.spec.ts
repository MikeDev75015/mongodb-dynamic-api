import * as SwaggerAPIDecorators from '@nestjs/swagger';
import * as CustomDecorators from '../../decorators';
import { AuthDecoratorsBuilder } from './auth-decorators.builder';

jest.mock('@nestjs/swagger');
jest.mock('../../decorators');

describe('AuthDecoratorsBuilder', () => {
  let publicDecoratorSpy: jest.SpyInstance;
  let apiBearerAuthDecoratorSpy: jest.SpyInstance;

  beforeEach(() => {
    publicDecoratorSpy = jest.spyOn(CustomDecorators, 'Public');
    apiBearerAuthDecoratorSpy = jest.spyOn(SwaggerAPIDecorators, 'ApiBearerAuth');
  });

  describe('build', () => {
    it('should return Public route decorator if route is public', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(undefined);
      authDecoratorsBuilder.build();

      expect(publicDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(apiBearerAuthDecoratorSpy).not.toHaveBeenCalled();
    });

    it('should return ApiBearerAuth route decorator if route is protected', () => {
      const authDecoratorsBuilder = new AuthDecoratorsBuilder(true);
      authDecoratorsBuilder.build();

      expect(apiBearerAuthDecoratorSpy).toHaveBeenCalledTimes(1);
      expect(publicDecoratorSpy).not.toHaveBeenCalled();
    });
  });
});
