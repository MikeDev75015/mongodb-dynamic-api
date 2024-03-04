import { INestApplication, VersioningOptions, VersioningType } from '@nestjs/common';

function enableDynamicAPIVersioning(
  app: INestApplication,
  options?: VersioningOptions,
) {
  app.enableVersioning({
    type: VersioningType.URI,
    ...options,
  });
}

function addVersionSuffix(version?: string) {
  return version ? `V${version}` : '';
}

export { addVersionSuffix, enableDynamicAPIVersioning };
