import type { ReturnsError } from "@saflib/monorepo";
import type { SecretStoreError } from "./errors.ts";

export abstract class SecretStore {
  abstract getSecretByName(
    name: string,
  ): Promise<ReturnsError<string, SecretStoreError>>;
}
