import { start__ServiceName__Service } from "./index.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@saflib/sentry";
import { startOryKratosService } from "@saflib/ory-kratos";
import { callbacks } from "template-package-kratos-courier";

validateEnv(process.env, envSchema);
setServiceName("__product-name__");

addLokiTransport();
initSentry();
collectSystemMetrics();

startOryKratosService({ callbacks });
start__ServiceName__Service();
