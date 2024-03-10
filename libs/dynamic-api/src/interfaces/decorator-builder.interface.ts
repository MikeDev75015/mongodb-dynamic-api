import { BaseEntity } from '../models';

interface DecoratorBuilder<Entity extends BaseEntity> {
  build(): (ClassDecorator & MethodDecorator)[];
}

export { DecoratorBuilder };
