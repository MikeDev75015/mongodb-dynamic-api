import { Type } from '@nestjs/common';
import { BaseEntity } from '../../../models';

type AuthAdditionalFields<Entity extends BaseEntity> = {
  toRegister?: (keyof Entity)[];
  toRequest?: (keyof Entity)[];
};

type AuthOptions<Entity extends BaseEntity = any> = {
  user: {
    entity: Type<Entity>;
    loginField: keyof Entity;
    passwordField: keyof Entity;
    additionalFields?: AuthAdditionalFields<Entity>;
  };
  jwt: {
    secret: string;
    expiresIn?: string | number;
  };
  protectRegister?: boolean;
};

export type { AuthOptions, AuthAdditionalFields };
