import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BcryptService } from './bcrypt.service';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('BcryptService', () => {
  let service: BcryptService;

  beforeEach(async () => {
    service = new BcryptService();
  });

  it('should have saltOrRounds defined and greater than 0', () => {
    expect(service['saltOrRounds']).toBeGreaterThan(0);
  });

  describe('hashPassword', () => {
    it('should return a hashed password', async () => {
      const password = 'password';
      const hash = 'hashedPassword';
      (bcrypt.hash as Mock).mockResolvedValue(hash);
      const result = await service.hashPassword(password);

      expect(result).toBe(hash);
    });
  });

  describe('comparePassword', () => {
    const password = 'password';
    const hash = 'hashedPassword';

    it('should return true if the password matches the hash', async () => {
      (bcrypt.compare as Mock).mockResolvedValue(true);
      const result = await service.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false if the password does not match the hash', async () => {
      (bcrypt.compare as Mock).mockResolvedValue(false);
      const result = await service.comparePassword(password, hash);

      expect(result).toBe(false);
    });
  });
});
