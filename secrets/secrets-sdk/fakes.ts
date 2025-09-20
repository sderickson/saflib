import {
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
  deleteSecretsHandler,
} from "./requests/secrets/index.fakes.ts";
import { listAccessRequestsHandler } from "./requests/access-requests/index.fakes.ts";

export const secretsServiceFakeHandlers = [
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
  deleteSecretsHandler,
  listAccessRequestsHandler,
];
