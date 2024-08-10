import { JwtService } from '@nestjs/jwt';
import { ExtendedSocket, GatewayResponse } from '../../../interfaces';
import { BaseEntity } from '../../../models';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { AuthService, LoginResponse } from './auth-service.interface';

interface AuthGateway<Entity extends BaseEntity> {
  login<Body>(socket: ExtendedSocket<Entity>, body: Body): GatewayResponse<LoginResponse>;
  register<Body>(socket: ExtendedSocket<Entity>, body: Body): GatewayResponse<LoginResponse>;
  getAccount(socket: ExtendedSocket<Entity>): GatewayResponse<Partial<Entity>>;
  updateAccount<Body>(socket: ExtendedSocket<Entity>, body: Body): GatewayResponse<Partial<Entity>>;
  resetPassword(body: ResetPasswordDto): GatewayResponse<void>;
  changePassword(body: ChangePasswordDto): GatewayResponse<void>;
}

type AuthGatewayConstructor<Entity extends BaseEntity> = new (
  service:AuthService<Entity>,
  jwtService: JwtService,
) => AuthGateway<Entity>;

export type { AuthGateway, AuthGatewayConstructor };
