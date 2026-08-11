import { describe, expect, it, vi } from 'vitest';
import {
  createInviteUserService,
  createPasswordResetRequestService,
  createResetPasswordService,
  hashPassword,
  hashResetToken,
  getUserFromToken,
  loginUser,
  registerUser,
  resolveRegistrationRole,
  signAuthToken,
  updateInternalUser,
  verifyAuthToken,
  verifyPassword
} from '../src/services/auth.service.js';
import { User } from '../src/models/index.js';

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
      role: 'admin',
      auth_token_version: 3
    });

    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('admin@example.com');
    expect(payload.role).toBe('admin');
    expect(payload.token_version).toBe(3);
  });

  it('validates tokens against the persisted session version after logout', async () => {
    const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue({
        id: 'user-versioned',
        email: 'admin@example.com',
        role: 'admin',
        active: true,
        auth_token_version: 3,
        toJSON() {
          return {
            id: this.id,
            email: this.email,
            role: this.role,
            active: this.active,
            auth_token_version: this.auth_token_version
          };
        }
      })
    });

    const token = signAuthToken({
      id: 'user-versioned',
      email: 'admin@example.com',
      role: 'admin',
      auth_token_version: 3
    });

    await expect(getUserFromToken(token)).resolves.toMatchObject({ id: 'user-versioned' });
    findOneSpy.mockRestore();
  });

  it('rejects invalid registration credentials before accessing the database', async () => {
    await expect(registerUser({
      email: 'invalid-email',
      password: 'short'
    })).rejects.toMatchObject({ code: 'invalid_email', status: 400 });

    await expect(registerUser({
      email: 'valid@example.com',
      password: 'short'
    })).rejects.toMatchObject({ code: 'invalid_password', status: 400 });
  });

  it('does not allow public registration to choose privileged roles', async () => {
    expect(resolveRegistrationRole('admin')).toBe('account_manager');
    expect(resolveRegistrationRole('ai_consultant')).toBe('account_manager');
    expect(resolveRegistrationRole('admin', { allowRoleOverride: true })).toBe('admin');
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
    expect(user.auth_token_version).toBe(1);
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

  it('does not allow inactive users to log in', async () => {
    const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 'user-3',
      email: 'inactive@example.com',
      password_hash: await hashPassword('secret-password'),
      active: false
    });

    await expect(loginUser({
      email: 'inactive@example.com',
      password: 'secret-password'
    })).rejects.toMatchObject({
      code: 'user_inactive',
      status: 403
    });

    findOneSpy.mockRestore();
  });

  it('updates an internal user and blocks self deactivation', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const user = {
      id: 'user-4',
      email: 'consultant@example.com',
      full_name: 'Consultant',
      role: 'ai_consultant',
      active: true,
      save,
      toJSON() {
        return {
          id: this.id,
          email: this.email,
          full_name: this.full_name,
          role: this.role,
          active: this.active
        };
      }
    };

    const findOneSpy = vi.spyOn(User, 'findOne');
    findOneSpy
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    const result = await updateInternalUser('user-4', {
      email: 'new-consultant@example.com',
      full_name: 'Updated Consultant',
      role: 'account_manager',
      active: true
    }, {
      actor: { id: 'admin-1' }
    });

    expect(result.email).toBe('new-consultant@example.com');
    expect(result.role).toBe('account_manager');
    expect(save).toHaveBeenCalledOnce();

    findOneSpy.mockResolvedValueOnce(user);

    await expect(updateInternalUser('user-4', { active: false }, {
      actor: { id: 'user-4' }
    })).rejects.toMatchObject({
      code: 'cannot_deactivate_self',
      status: 400
    });

    findOneSpy.mockRestore();
  });
});
