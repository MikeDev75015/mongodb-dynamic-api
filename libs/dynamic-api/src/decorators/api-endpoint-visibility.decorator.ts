import { applyDecorators, CustomDecorator } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

function ApiEndpointVisibility(condition: boolean, decorator?: MethodDecorator | CustomDecorator): MethodDecorator | CustomDecorator {
  const decoratorIfValid = decorator ?? ((_: any) => undefined);

  return applyDecorators(!condition ? ApiExcludeEndpoint() : decoratorIfValid);
}

export { ApiEndpointVisibility };
