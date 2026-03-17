import { applyDecorators, CustomDecorator } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

/** @deprecated Internal API — will be removed from public exports in v5. */
function ApiEndpointVisibility(
  condition: boolean,
  decorator?: MethodDecorator | CustomDecorator,
): MethodDecorator | CustomDecorator {
  const noopDecorator: MethodDecorator = () => {};
  const decoratorToApply = decorator ?? noopDecorator;
  return applyDecorators(!condition ? ApiExcludeEndpoint() : decoratorToApply);
}

export { ApiEndpointVisibility };
