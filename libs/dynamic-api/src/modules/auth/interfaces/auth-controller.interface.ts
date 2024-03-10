import { BaseEntity } from '../../../models';
import { AuthService, LoginResponse } from './auth-service.interface';

interface AuthController<Entity extends BaseEntity> {
  login<Body>(req: any, body: Body): Promise<LoginResponse>;
  register<Body>(body: Body): Promise<LoginResponse>;
  getAccount(req: any): Promise<Partial<Entity>>;
}

type AuthControllerConstructor<Entity extends BaseEntity> = new (
  service:AuthService<Entity>,
) => AuthController<Entity>;

export type { AuthController, AuthControllerConstructor };
