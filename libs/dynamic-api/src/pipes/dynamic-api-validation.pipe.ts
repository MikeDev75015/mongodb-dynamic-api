import { Injectable, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform, ValidationPipeOptions } from '@nestjs/common';

/** Applied to request bodies unless overridden: undeclared properties are rejected with a 400. */
const BODY_VALIDATION_DEFAULTS: ValidationPipeOptions = { whitelist: true, forbidNonWhitelisted: true };

/**
 * Validation options of a route whose app configured none (no route/controller
 * `validationPipeOptions`). Kept lenient: the strict body defaults only apply once the app opts
 * into validation explicitly, since most entities declare their fields with `@Prop()` alone.
 */
const IMPLICIT_ROUTE_VALIDATION_OPTIONS: ValidationPipeOptions = Object.freeze({ transform: true });

/**
 * `ValidationPipe` that defaults to `whitelist` + `forbidNonWhitelisted` for request bodies only.
 * Used whenever the app configures validation itself (`validationPipeOptions`,
 * `enableDynamicAPIValidation`).
 * Query strings and route params keep the given options as-is: a GetMany query is a free-form
 * filter (already checked for MongoDB operator keys), not a declared DTO.
 * @internal Not part of the public API.
 */
@Injectable()
class DynamicApiValidationPipe implements PipeTransform {
  private readonly bodyPipe: ValidationPipe;
  private readonly defaultPipe: ValidationPipe;

  constructor(options: ValidationPipeOptions = {}) {
    this.bodyPipe = new ValidationPipe({ ...BODY_VALIDATION_DEFAULTS, ...options });
    this.defaultPipe = new ValidationPipe(options);
  }

  transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    return (metadata.type === 'body' ? this.bodyPipe : this.defaultPipe).transform(value, metadata);
  }
}

export { BODY_VALIDATION_DEFAULTS, DynamicApiValidationPipe, IMPLICIT_ROUTE_VALIDATION_OPTIONS };
