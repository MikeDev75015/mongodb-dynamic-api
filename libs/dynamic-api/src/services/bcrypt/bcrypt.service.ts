import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Small, self-contained password hashing utility (bcrypt), usable standalone via DI —
 * consumers rely on this directly for their own password handling outside the built-in
 * `useAuth` flow (e.g. linking a social account to a password-based one).
 */
@Injectable()
export class BcryptService {
  private readonly saltOrRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltOrRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
