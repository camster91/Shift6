import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login } from './syncClient';

describe('syncClient authentication input validation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'mock-token', user: { email: 'test@example.com' } }),
      })
    ));
  });

  it('rejects invalid email formats during register', async () => {
    await expect(register('invalid-email', 'password123')).rejects.toThrow('Invalid email format');
    await expect(register('', 'password123')).rejects.toThrow('Invalid email format');
    await expect(register('   ', 'password123')).rejects.toThrow('Invalid email format');
    await expect(register('test@', 'password123')).rejects.toThrow('Invalid email format');
  });

  it('rejects short or long passwords during register', async () => {
    await expect(register('test@example.com', 'short')).rejects.toThrow('Password must be between 8 and 128 characters');
    await expect(register('test@example.com', 'a'.repeat(129))).rejects.toThrow('Password must be between 8 and 128 characters');
  });

  it('rejects invalid email formats during login', async () => {
    await expect(login('invalid-email', 'password123')).rejects.toThrow('Invalid email format');
  });

  it('rejects empty passwords during login', async () => {
    await expect(login('test@example.com', '')).rejects.toThrow('Password is required');
  });

  it('successfully registers when inputs are valid', async () => {
    const user = await register('test@example.com', 'securepass123');
    expect(user).toBeDefined();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('successfully logs in with a short password if that user exists in DB', async () => {
    const user = await login('test@example.com', 'abc');
    expect(user).toBeDefined();
    expect(global.fetch).toHaveBeenCalled();
  });
});
