import { applyDecorators, CustomDecorator } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

/** @internal Not part of the public API. */
function ApiEndpointVisibility(
  condition: boolean,
  decorator?: MethodDecorator | CustomDecorator,
): MethodDecorator | CustomDecorator {
  const noopDecorator: MethodDecorator = () => {};
  const decoratorToApply = decorator ?? noopDecorator;
  return applyDecorators(!condition ? ApiExcludeEndpoint() : decoratorToApply);
}

export { ApiEndpointVisibility };
