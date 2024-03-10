import { SetMetadata } from '@nestjs/common';

const IS_PUBLIC_KEY = 'isPublic';
const Public = (disabled = false) => SetMetadata(IS_PUBLIC_KEY, !disabled);

export { IS_PUBLIC_KEY, Public };
