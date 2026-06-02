import { createAuthClient } from './authClient';
import { createEntitiesClient } from './entitiesClient';
import { createFunctionsClient } from './functionsClient';
import { createIntegrationsClient } from './integrationsClient';
import { createUsersClient } from './usersClient';

export const base44 = {
  auth: createAuthClient(),
  entities: createEntitiesClient(),
  functions: createFunctionsClient(),
  integrations: createIntegrationsClient(),
  users: createUsersClient()
};
