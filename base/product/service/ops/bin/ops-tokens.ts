#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Manage ops tokens directly in the product's ops database. For bootstrapping
 * (the first token, before anyone has used the admin UI) and break-glass
 * revocation. Run inside the monolith container, e.g.
 *
 *   node --experimental-strip-types ./bin/ops-tokens.ts create --name "maintenance agent"
 *
 * Unlike the admin API, these changes are not audit-logged (there is no
 * signed-in admin); they are logged to stdout and the service log.
 */
import { Command, Option } from "commander";
import {
  makeSubsystemReporters,
  safContextStorage,
  safReportersStorage,
  setServiceName,
} from "@saflib/node";
import {
  createToken,
  listTokens,
  opsTokenScopes,
  OpsTokenAlreadyRevokedError,
  OpsTokenNotFoundError,
  revokeToken,
} from "@saflib/ops-db";
import { getBaseOpsDbKey } from "../ops.ts";

function inCli<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
  return safContextStorage.run(
    { requestId: `cli-${Date.now()}`, serviceName: "ops-tokens", subsystemName: "cli", operationName },
    () => safReportersStorage.run(makeSubsystemReporters("cli", operationName), fn),
  );
}

function fail(message: string): void {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

setServiceName("ops-tokens");

const program = new Command()
  .name("ops-tokens")
  .description("Create, list and revoke ops API tokens in this product's ops database.");

program
  .command("create")
  .description("Mint a token. Prints the secret once; store it (e.g. in 1Password) immediately.")
  .requiredOption("--name <name>", "label, e.g. 'maintenance agent (GitHub Actions)'")
  .addOption(
    new Option("--scope <scope...>", "scopes to grant")
      .choices([...opsTokenScopes])
      .default(["ops:read"]),
  )
  .option("--expires-in-days <days>", "expire after this many days")
  .action((opts: { name: string; scope: (typeof opsTokenScopes)[number][]; expiresInDays?: string }) =>
    inCli("create", async () => {
      const days = opts.expiresInDays ? Number(opts.expiresInDays) : undefined;
      if (days !== undefined && !(days > 0)) {
        fail("--expires-in-days must be a positive number");
        return;
      }
      const { result, error } = await createToken(getBaseOpsDbKey(), {
        name: opts.name,
        scopes: opts.scope,
        createdBy: "cli",
        expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
      });
      if (error) throw error;
      makeSubsystemReporters("cli", "create").log.info("ops token created via CLI", {
        opsTokenId: result.opsToken.id,
      });
      console.log(`id:      ${result.opsToken.id}`);
      console.log(`scopes:  ${result.opsToken.scopes.join(", ")}`);
      console.log(`expires: ${result.opsToken.expires_at?.toISOString() ?? "never"}`);
      console.log(`token:   ${result.token}`);
      console.log("\nThis is the only time the token is shown.");
    }),
  );

program
  .command("list")
  .description("List tokens (never shows secrets).")
  .action(() =>
    inCli("list", async () => {
      const { result } = await listTokens(getBaseOpsDbKey());
      for (const t of result ?? []) {
        const state = t.revoked_at ? "revoked" : t.expires_at && t.expires_at < new Date() ? "expired" : "active";
        console.log(
          [t.id, `safops_${t.token_prefix}…`, state, t.scopes.join(","), t.name, `last used ${t.last_used_at?.toISOString() ?? "never"}`].join("  "),
        );
      }
    }),
  );

program
  .command("revoke <id>")
  .description("Revoke a token by id (permanent).")
  .action((id: string) =>
    inCli("revoke", async () => {
      const { error } = await revokeToken(getBaseOpsDbKey(), id);
      if (error) {
        switch (true) {
          case error instanceof OpsTokenNotFoundError:
            fail(`no ops token with id ${id}`);
            return;
          case error instanceof OpsTokenAlreadyRevokedError:
            fail(`ops token ${id} is already revoked`);
            return;
          default:
            throw error satisfies never;
        }
      }
      makeSubsystemReporters("cli", "revoke").log.info("ops token revoked via CLI", { opsTokenId: id });
      console.log(`revoked ${id}`);
    }),
  );

await program.parseAsync(process.argv);
