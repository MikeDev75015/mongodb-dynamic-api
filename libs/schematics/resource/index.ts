import { apply, applyTemplates, mergeWith, move, Rule, SchematicsException, url } from '@angular-devkit/schematics';

export interface ResourceOptions {
  name: string;
  path?: string;
  flat?: boolean;
  softDelete?: boolean;
}

/**
 * Converts an arbitrary identifier (`user`, `user-profile`, `user_profile`, `UserProfile`, ...)
 * into `PascalCase`, for use as a class name.
 */
function classify(input: string): string {
  return input
  .replace(/[-_\s]+(.)?/g, (_match, chr: string | undefined) => (chr ? chr.toUpperCase() : ''))
  .replace(/^(.)/, (chr) => chr.toUpperCase());
}

/**
 * Converts an arbitrary identifier into `kebab-case`, for use as a file name, collection name,
 * or route path segment.
 */
function dasherize(input: string): string {
  return input
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/[\s_]+/g, '-')
  .toLowerCase();
}

/**
 * Resolves the directory the generated files are written to: `<path>/<dasherized-name>`, or
 * bare `<path>` when `flat` is set. Extracted as a pure function so it's testable without the
 * schematics engine — `path`'s schema default only kicks in when invoked through `nest generate`
 * or `SchematicTestRunner`, never for a direct/programmatic call to {@link resource}.
 */
export function resolveDestination(options: ResourceOptions): string {
  const basePath = options.path ?? 'src';
  return options.flat ? basePath : `${basePath}/${dasherize(options.name)}`;
}

/**
 * `nest generate --collection mongodb-dynamic-api resource <name>` — scaffolds a
 * `<name>.entity.ts` (extending `BaseEntity`/`SoftDeletableEntity`) and a `<name>.module.ts`
 * (wiring `DynamicApiModule.forFeature`) in one command.
 */
export function resource(options: ResourceOptions): Rule {
  if (!options.name) {
    throw new SchematicsException('name option is required.');
  }

  const destination = resolveDestination(options);

  const templateSource = apply(url('./files'), [
    applyTemplates({
      classify,
      dasherize,
      name: options.name,
      softDelete: !!options.softDelete,
    }),
    move(destination),
  ]);

  return mergeWith(templateSource);
}
