import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
/** @deprecated Internal API — will be removed from public exports in v5. */
export class BcryptService {
  private readonly saltOrRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltOrRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
