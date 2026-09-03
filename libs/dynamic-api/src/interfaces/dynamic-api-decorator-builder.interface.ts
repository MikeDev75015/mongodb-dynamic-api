import { BaseEntity } from '../models';

/** @internal Not part of the public API. */
interface DynamicApiDecoratorBuilder<Entity extends BaseEntity> {
  build(): (ClassDecorator | MethodDecorator)[];
}

export { DynamicApiDecoratorBuilder };
