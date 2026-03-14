import { BaseEntity } from '../../../models';

type LoginResponse = { accessToken: string; refreshToken?: string };

interface AuthService<Entity extends BaseEntity> {
  validateUser(login: string, pass: string): Promise<Entity>;

  login(user: Entity): Promise<LoginResponse>;

  register(userToCreate: Partial<Entity>): Promise<LoginResponse>;

  getAccount(user: Entity): Promise<Entity>;

  updateAccount(user: Entity, update: Partial<Entity>): Promise<Entity>;

  resetPassword(email: string): Promise<void>;

  changePassword(resetPasswordToken: string, newPassword: string): Promise<void>;

  refreshToken(user: Entity, rawToken?: string): Promise<LoginResponse>;

  logout(user: Entity): Promise<void>;
}

export type { AuthService, LoginResponse };
