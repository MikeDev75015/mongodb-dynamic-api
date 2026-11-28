import { describe, expect, it } from 'vitest';
import { Get, Post } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { removeRouteHandler } from './remove-route-handler.helper';

describe('removeRouteHandler', () => {
  class TestController {
    @Get('kept')
    kept() {
      return 'kept';
    }

    @Post('removed')
    removed() {
      return 'removed';
    }
  }

  it('should delete the handler (and its route metadata) from the prototype only', () => {
    removeRouteHandler(TestController.prototype, 'removed');

    const instance = new TestController();

    expect(instance.removed).toBeUndefined();
    expect(Object.getOwnPropertyNames(TestController.prototype)).not.toContain('removed');
    expect(instance.kept()).toBe('kept');
    expect(Reflect.getMetadata(PATH_METADATA, TestController.prototype.kept)).toBe('kept');
  });

  it('should be a no-op for an unknown handler', () => {
    expect(() => removeRouteHandler(TestController.prototype, 'unknown')).not.toThrow();
    expect(Object.getOwnPropertyNames(TestController.prototype)).toContain('kept');
  });
});
