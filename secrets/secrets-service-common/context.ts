import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "@saflib/secrets-db";

export interface SecretsServiceContext {
  secretsDbKey: DbKey;
}

export const secretsServiceStorage =
  new AsyncLocalStorage<SecretsServiceContext>();

export interface SecretsServiceContextOptions {
  secretsDbKey?: DbKey;
}

export const makeContext = (
  options: SecretsServiceContextOptions = {},
): SecretsServiceContext => {
  const dbKey = options.secretsDbKey ?? secretsDb.connect();
  return {
    secretsDbKey: dbKey,
  };
};
