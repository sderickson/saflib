import { startTemplatesService } from "./index.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@saflib/sentry";
import { startOryKratosService } from "@saflib/ory-kratos";
import {
  courierCallbacks,
  makeKratosActionHandler,
} from "@saflib/templates-kratos-handlers";

validateEnv(process.env, envSchema);
setServiceName("templates");

addLokiTransport();
initSentry();
collectSystemMetrics();

startOryKratosService({
  courierCallbacks,
  actionHandler: makeKratosActionHandler(),
});
startTemplatesService();
