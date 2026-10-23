import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false);
  });
});
