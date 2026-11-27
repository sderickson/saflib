#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * List, download or restore the app's backups. Run inside the app image,
 * where the backups store's credentials and the data volumes are. To
 * restore, stop the app (both colors) and run a one-off container, e.g.
 *
 *   docker compose run --rm --no-deps <app service> \
 *     node --experimental-strip-types ./bin/backups.ts restore <id> --yes
 *
 * (from this package's directory). `list` and `download` are safe while
 * the app runs.
 */
import { makeSubsystemReporters, safContextStorage, safReportersStorage, setServiceName } from "@saflib/node";
import { runBackupsCli } from "@saflib/ops-http";
import { getBaseOpsDbKey, baseBackupsConfig } from "../ops.ts";

setServiceName("backups");
const argv = process.argv.slice(2);
const code = await safContextStorage.run(
  { requestId: `cli-${Date.now()}`, serviceName: "backups", subsystemName: "cli", operationName: argv[0] ?? "help" },
  () =>
    safReportersStorage.run(makeSubsystemReporters("cli", argv[0] ?? "help"), () =>
      runBackupsCli(argv, { dbKey: getBaseOpsDbKey(), store: baseBackupsConfig([])?.store }),
    ),
);
process.exitCode = code;
