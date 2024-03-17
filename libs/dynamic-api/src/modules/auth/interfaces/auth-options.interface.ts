import { Type } from '@nestjs/common';
import { DynamicApiRegisterAbilityPredicate } from '../../../interfaces';
import { BaseEntity } from '../../../models';

type DynamicApiRegisterOptions<Entity extends BaseEntity = any> = {
  protected?: boolean;
  abilityPredicate?: DynamicApiRegisterAbilityPredicate;
  additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
};

type DynamicApiAuthOptions<Entity extends BaseEntity = any> = {
  user: {
    entity: Type<Entity>;
    loginField?: keyof Entity;
    passwordField?: keyof Entity;
    requestAdditionalFields?: (keyof Entity)[];
  };
  register?: DynamicApiRegisterOptions;
  jwt?: {
    secret: string;
    expiresIn?: string | number;
  };
};

export type { DynamicApiAuthOptions, DynamicApiRegisterOptions };
