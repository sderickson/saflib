import { start__ServiceName__Service } from "template-package-service";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@__organization-name__/sentry";

validateEnv(process.env, envSchema);
setServiceName("__product-name__");
addLokiTransport();
initSentry();
collectSystemMetrics();

start__ServiceName__Service();

