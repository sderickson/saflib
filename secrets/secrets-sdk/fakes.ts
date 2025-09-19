import {
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
} from "./requests/secrets/index.fakes.ts";

export const secretsServiceFakeHandlers = [
  listSecretsHandler,
  createSecretsHandler,
  updateSecretsHandler,
];
