import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
interface DynamicApiDecoratorBuilder<Entity extends BaseEntity> {
  build(): (ClassDecorator | MethodDecorator)[];
}

export { DynamicApiDecoratorBuilder };
