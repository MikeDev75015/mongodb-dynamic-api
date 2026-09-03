import { SetMetadata } from '@nestjs/common';

/** @internal Not part of the public API. */
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export { IS_PUBLIC_KEY, Public };
