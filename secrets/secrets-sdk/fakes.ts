import {
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
  deleteSecretsHandler,
} from "./requests/secrets/index.fakes.ts";
import { listAccessRequestsHandler, approveAccessRequestsHandler } from "./requests/access-requests/index.fakes.ts";
import { listServiceTokensHandler, approveServiceTokensHandler } from "./requests/service-tokens/index.fakes.ts";

export const secretsServiceFakeHandlers = [
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
  deleteSecretsHandler,
  listAccessRequestsHandler,
  approveAccessRequestsHandler,
  listServiceTokensHandler,
  approveServiceTokensHandler,
];
