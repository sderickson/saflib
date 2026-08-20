import { startBaseService } from "./index.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@saflib/sentry";
import { startOryKratosService } from "@saflib/ory-kratos";
import {
  courierCallbacks,
  makeKratosActionHandler,
} from "@saflib/base-kratos-handlers";

validateEnv(process.env, envSchema);
setServiceName("base");

addLokiTransport();
initSentry();
collectSystemMetrics();

startOryKratosService({
  courierCallbacks,
  actionHandler: makeKratosActionHandler(),
});
startBaseService();
