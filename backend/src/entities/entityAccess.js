export function assertEntityAccess({ entityName, action, user }) {
  if (entityName !== 'User') {
    return;
  }

  if (!user) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.code = 'auth_required';
    throw error;
  }

  if (user.role !== 'admin') {
    const error = new Error('Forbidden');
    error.status = 403;
    error.code = 'forbidden';
    throw error;
  }
}
