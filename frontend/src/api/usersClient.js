export function createUsersClient() {
  return {
    inviteUser: async () => {
      throw new Error('User invitations are not migrated yet.');
    }
  };
}
