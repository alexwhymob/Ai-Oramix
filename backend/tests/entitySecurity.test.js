import { describe, expect, it } from 'vitest';
import { applyEntityWriteDefaults } from '../src/entities/entityAccess.js';

describe('entity security', () => {
  it('rejects security fields in generic user updates', () => {
    expect(() => applyEntityWriteDefaults({
      entityName: 'User',
      action: 'update',
      payload: { active: true, password_hash: 'should-not-be-accepted' },
      user: { role: 'admin' }
    })).toThrowError(expect.objectContaining({ code: 'user_field_not_editable' }));
  });

  it('allows only safe profile fields in generic user updates', () => {
    expect(applyEntityWriteDefaults({
      entityName: 'User',
      action: 'update',
      payload: { full_name: 'Admin', role: 'admin' },
      user: { role: 'admin' }
    })).toEqual({ full_name: 'Admin', role: 'admin' });
  });
});
