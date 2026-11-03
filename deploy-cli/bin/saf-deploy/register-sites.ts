import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { readRemoteScript, runLocal, runRemote } from "../../src/remote.ts";

export const addRegisterSitesCommand = (program: Command) => {
  program
    .command("register-sites")
    .description(
      "Copy remote-assets/caddy/*.Caddyfile into the platform's edge Caddy (SAF_EDGE_CONTAINER) and reload it. `up` and `release` do this already.",
    )
    .option(
      "--local",
      "Register with the local Docker's edge (prod-local) instead of the server's",
    )
    .action(
      action(async (options: { local?: boolean }) => {
        const config = loadDeployConfig();
        const script = readRemoteScript("register-sites");
        await (options.local
          ? runLocal(config, script)
          : runRemote(config, script));
      }),
    );
};
