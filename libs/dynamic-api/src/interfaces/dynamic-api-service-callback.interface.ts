import { BaseEntity } from '../models';

type DynamicApiCallbackMethods<Entity extends BaseEntity> = {
  findById: (id: string) => Promise<Entity | undefined>;
  findAndUpdateById: (id: string, update: Partial<Entity>) => Promise<Entity>;
};

type DynamicApiServiceCallback<Entity extends BaseEntity> = (
  entity: Entity,
  methods: DynamicApiCallbackMethods<Entity>,
) => Promise<void>;

type DynamicApiResetPasswordCallbackMethods<Entity extends BaseEntity, UpdateBy = 'userId'> = {
  findUserByEmail: (email: string) => Promise<Entity | undefined>;
  updateUserByEmail: (email: string, update: Partial<Entity>) => Promise<Entity>;
};

type DynamicApiResetPasswordCallback<Entity extends BaseEntity> = (
  _: { resetPasswordToken: string; email: string },
  methods: DynamicApiResetPasswordCallbackMethods<Entity>,
) => Promise<void>;

export type {
  DynamicApiServiceCallback,
  DynamicApiResetPasswordCallback,
  DynamicApiCallbackMethods,
  DynamicApiResetPasswordCallbackMethods,
};
