import { startBaseService } from "./index.ts";
import { collectSystemMetrics, setServiceName } from "@saflib/node";
import { addLokiTransport } from "@saflib/vendors-loki";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@saflib/vendors-sentry";
import { startOryKratosService } from "@saflib/ory-kratos";
import {
  courierCallbacks,
  makeKratosActionHandler,
} from "@saflib/base-kratos-handlers";
import { initializeDependencies } from "@saflib/base-service-common/dependencies";

validateEnv(process.env, envSchema);
setServiceName("base");

addLokiTransport();
initSentry();
collectSystemMetrics();

await initializeDependencies();

startOryKratosService({
  courierCallbacks,
  actionHandler: makeKratosActionHandler(),
});
await startBaseService();
