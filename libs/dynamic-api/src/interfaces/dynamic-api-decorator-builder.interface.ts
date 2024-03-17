import { BaseEntity } from '../models';

interface DynamicApiDecoratorBuilder<Entity extends BaseEntity> {
  build(): (ClassDecorator & MethodDecorator)[];
}

export { DynamicApiDecoratorBuilder };
