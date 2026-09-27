import { Injectable, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform, ValidationPipeOptions } from '@nestjs/common';

/** Applied to request bodies unless overridden: undeclared properties are rejected with a 400. */
const BODY_VALIDATION_DEFAULTS: ValidationPipeOptions = { whitelist: true, forbidNonWhitelisted: true };

/**
 * Validation options of a route whose app configured none (no route/controller
 * `validationPipeOptions`). Kept lenient: the strict body defaults only apply once the app opts
 * into validation explicitly, since most entities declare their fields with `@Prop()` alone.
 */
/**
 * Plain copy of a validated DTO instance — own enumerable properties only, nested DTO instances
 * included. No class-transformer rule is applied: `@Exclude({ toPlainOnly })` / output
 * `@Transform`s describe responses, not requests. Dates, Maps and Sets are kept as they are.
 */
function toPlainInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toPlainInput);
  }

  if (value === null || typeof value !== 'object' || value instanceof Date || value instanceof Map || value instanceof Set) {
    return value;
  }

  return Object.fromEntries(
    // Nest may pin a `constructor` own property on the instance it validated.
    Object.entries(value).filter(([key]) => key !== 'constructor').map(([key, item]) => [key, toPlainInput(item)]),
  );
}

const IMPLICIT_ROUTE_VALIDATION_OPTIONS: ValidationPipeOptions = Object.freeze({ transform: true });

/**
 * `ValidationPipe` that defaults to `whitelist` + `forbidNonWhitelisted` for request bodies only.
 * Used whenever the app configures validation itself (`validationPipeOptions`,
 * `enableDynamicAPIValidation`).
 * Query strings and route params keep the given options as-is: a GetMany query is a free-form
 * filter (already checked for MongoDB operator keys), not a declared DTO.
 *
 * Unless `transform: true` is set, a validated body is handed over as a plain object built from
 * the whitelisted DTO instance, **without** applying its class-transformer output rules. Nest's own
 * `ValidationPipe` would return `classToPlain(dto)` instead, which applies output-only rules such as
 * `@Exclude({ toPlainOnly: true })` to the request — silently dropping e.g. `password`.
 * @internal Not part of the public API.
 */
@Injectable()
class DynamicApiValidationPipe implements PipeTransform {
  private readonly bodyPipe: ValidationPipe;
  private readonly defaultPipe: ValidationPipe;
  private readonly keepsBodyInstances: boolean;

  constructor(options: ValidationPipeOptions = {}) {
    // transform: true makes Nest return the validated (whitelisted) instance itself, never
    // classToPlain(instance) — converted back to a plain input below when the app didn't ask for it.
    this.bodyPipe = new ValidationPipe({ ...BODY_VALIDATION_DEFAULTS, ...options, transform: true });
    this.defaultPipe = new ValidationPipe(options);
    this.keepsBodyInstances = options.transform === true;
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (metadata.type !== 'body') {
      return this.defaultPipe.transform(value, metadata);
    }

    const validated: unknown = await this.bodyPipe.transform(value, metadata);

    if (this.keepsBodyInstances || validated === value || validated === null || typeof validated !== 'object') {
      return validated;
    }

    if (value === null || value === undefined) {
      // Nest validates a missing body as {} — hand the original value back, as without transform.
      return value;
    }

    return toPlainInput(validated);
  }
}

export { BODY_VALIDATION_DEFAULTS, DynamicApiValidationPipe, IMPLICIT_ROUTE_VALIDATION_OPTIONS, toPlainInput };
