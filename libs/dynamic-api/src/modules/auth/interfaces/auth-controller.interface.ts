import { BaseEntity } from '../../../models';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { AuthService, LoginResponse } from './auth-service.interface';

interface AuthController<Entity extends BaseEntity> {
  login<Body>(req: any, body: Body): Promise<LoginResponse>;
  register<Body>(body: Body): Promise<LoginResponse>;
  getAccount(req: any): Promise<Partial<Entity>>;
  resetPassword(body: ResetPasswordDto): Promise<void>;
  changePassword(body: ChangePasswordDto): Promise<void>;
}

type AuthControllerConstructor<Entity extends BaseEntity> = new (
  service:AuthService<Entity>,
) => AuthController<Entity>;

export type { AuthController, AuthControllerConstructor };
