import { describe, expect, it, vi } from 'vitest';
import {
  createInviteUserService,
  createPasswordResetRequestService,
  createResetPasswordService,
  hashPassword,
  hashResetToken,
  signAuthToken,
  verifyAuthToken,
  verifyPassword
} from '../src/services/auth.service.js';

describe('auth service', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('secret-password');

    expect(hash).not.toBe('secret-password');
    await expect(verifyPassword('secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('signs and verifies auth tokens', () => {
    const token = signAuthToken({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin'
    });

    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('admin@example.com');
    expect(payload.role).toBe('admin');
  });

  it('stores a hashed reset token and sends reset email', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockResolvedValue({ success: true });
    const user = {
      email: 'admin@example.com',
      full_name: 'Admin',
      save
    };

    const requestPasswordReset = createPasswordResetRequestService({
      User: {
        findOne: vi.fn().mockResolvedValue(user)
      },
      email: { sendEmail },
      now: () => new Date('2026-06-02T10:00:00.000Z')
    });

    await expect(requestPasswordReset({ email: 'admin@example.com' })).resolves.toEqual({ success: true });
    expect(user.reset_password_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.reset_password_expires_at).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('resets password when token is valid', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const user = {
      password_hash: 'old-hash',
      reset_password_token_hash: 'existing-hash',
      reset_password_expires_at: new Date('2026-06-02T11:00:00.000Z'),
      save
    };
    const resetToken = 'plain-token';
    const resetPasswordWithToken = createResetPasswordService({
      User: {
        findOne: vi.fn().mockResolvedValue(user)
      },
      now: () => new Date('2026-06-02T10:00:00.000Z'),
      hashPassword: vi.fn().mockResolvedValue('new-hash')
    });

    await expect(resetPasswordWithToken({
      resetToken,
      newPassword: 'new-password'
    })).resolves.toEqual({ success: true });

    expect(hashResetToken(resetToken)).toHaveLength(64);
    expect(user.password_hash).toBe('new-hash');
    expect(user.reset_password_token_hash).toBeNull();
    expect(user.reset_password_expires_at).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });

  it('creates or updates a user and sends an invite email', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockResolvedValue({ success: true });
    const createdUser = {
      id: 'user-2',
      email: 'invitee@example.com',
      full_name: 'Invitee',
      role: 'ai_consultant',
      password_hash: null,
      save,
      toJSON() {
        return {
          id: this.id,
          email: this.email,
          full_name: this.full_name,
          role: this.role,
          password_hash: this.password_hash,
          reset_password_token_hash: this.reset_password_token_hash,
          reset_password_expires_at: this.reset_password_expires_at
        };
      }
    };

    const inviteUser = createInviteUserService({
      User: {
        findOne: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdUser)
      },
      email: { sendEmail },
      now: () => new Date('2026-06-03T10:00:00.000Z')
    });

    const result = await inviteUser({
      email: 'invitee@example.com',
      role: 'ai_consultant',
      full_name: 'Invitee'
    });

    expect(result.success).toBe(true);
    expect(result.invited_user.email).toBe('invitee@example.com');
    expect(result.invited_user.role).toBe('ai_consultant');
    expect(createdUser.reset_password_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(createdUser.reset_password_expires_at).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
