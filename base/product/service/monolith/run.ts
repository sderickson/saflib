import { startBaseService } from "./index.ts";
import { collectSystemMetrics, setServiceName } from "@saflib/node";
import { addLokiTransport } from "@saflib/vendors-loki";
import { validateEnv } from "@saflib/env";
import { configureMockErrors } from "@saflib/errors-service";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { startOryKratosService } from "@saflib/ory-kratos-http";
import {
  callbacks,
  makeKratosActionHandler,
} from "@saflib/base-kratos-handlers";
import { initializeDependencies } from "./dependencies.ts";
import {
  configureBaseIssues,
  enableBasePersistentLogs,
  startBaseOpsNotifier,
} from "@saflib/base-ops";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";

validateEnv(process.env, envSchema);
setServiceName("base");

addLokiTransport();
// Redacted, searchable logs for GET /ops/logs (see @saflib/node-log-db).
enableBasePersistentLogs();
// Grouped, persistent issues for server errors/warnings and client/CSP
// reports (GET /ops/issues). configureMockErrors() below then no-ops; it
// remains the fallback if issues are removed.
configureBaseIssues();
configureMockErrors();
collectSystemMetrics();

await initializeDependencies();
// Batched, rate-limited email to site admins for new alerts and errors.
startBaseOpsNotifier(resolveEmailServiceFromEnv(), "Base <noreply@saflib.com>");

startOryKratosService({
  courierCallbacks: callbacks,
  actionHandler: makeKratosActionHandler(),
});
await startBaseService();
