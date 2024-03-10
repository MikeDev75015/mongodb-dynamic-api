import { BaseEntity } from '../../../models';

type LoginResponse = { accessToken: string };

interface AuthService<Entity extends BaseEntity> {
  validateUser(login: string, pass: string): Promise<Entity>;

  login(user: Entity): Promise<LoginResponse>;

  register(userToCreate: Partial<Entity>): Promise<LoginResponse>;

  getAccount(user: Entity): Promise<Entity>;

  changePassword(userId: string, newPassword: string): Promise<LoginResponse>;
}

export type { AuthService, LoginResponse };
