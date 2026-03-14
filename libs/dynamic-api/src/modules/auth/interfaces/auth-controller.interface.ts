import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { BaseEntity } from '../../../models';
import { DynamicApiBroadcastService } from '../../../services';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { AuthService, LoginResponse } from './auth-service.interface';

interface AuthController<Entity extends BaseEntity> {
  login<Body>(req: { user: Entity }, body: Body, res: Response): Promise<LoginResponse>;
  register<Body>(body: Body, res: Response): Promise<LoginResponse>;
  getAccount(req: { user: Entity }): Promise<Partial<Entity>>;
  updateAccount<Body>(req: { user: Entity }, body: Body): Promise<Entity>;
  resetPassword(body: ResetPasswordDto): Promise<void>;
  changePassword(body: ChangePasswordDto): Promise<void>;
  refreshToken(req: { user: Entity; headers: Record<string, string>; cookies: Record<string, string> }, res: Response): Promise<LoginResponse>;
  logout(req: { user: Entity }, res: Response): Promise<void>;
}

type AuthControllerConstructor<Entity extends BaseEntity> = new (
  service: AuthService<Entity>,
  broadcastService?: DynamicApiBroadcastService,
  jwtService?: JwtService,
) => AuthController<Entity>;

export type { AuthController, AuthControllerConstructor };
