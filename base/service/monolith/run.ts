import { startBaseService } from "./index.ts";
import { collectSystemMetrics, setServiceName } from "@saflib/node";
import { addLokiTransport } from "@saflib/vendors-loki";
import { validateEnv, isDevelopmentDeployment } from "@saflib/env";
import { configureMockErrors } from "@saflib/errors-service";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { startOryKratosService } from "@saflib/ory-kratos-http";
import {
  callbacks,
  makeKratosActionHandler,
} from "@saflib/base-kratos-handlers";
import { initializeDependencies } from "@saflib/base-service-common/dependencies";

validateEnv(process.env, envSchema);
setServiceName("base");

addLokiTransport();
if (isDevelopmentDeployment()) {
  configureMockErrors();
}
collectSystemMetrics();

await initializeDependencies();

startOryKratosService({
  courierCallbacks: callbacks,
  actionHandler: makeKratosActionHandler(),
});
await startBaseService();
