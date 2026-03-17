import { BaseEntity } from '../models';

/** @deprecated Internal API — will be removed from public exports in v5. */
interface DynamicApiDecoratorBuilder<Entity extends BaseEntity> {
  build(): (ClassDecorator | MethodDecorator)[];
}

export { DynamicApiDecoratorBuilder };
