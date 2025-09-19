import {
  listSecretsHandler,
  createSecretsHandler,
} from "./requests/secrets/index.fakes.ts";

export const secretsServiceFakeHandlers = [
  listSecretsHandler,
  createSecretsHandler,
];
