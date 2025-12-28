import { start__ServiceName__Service } from "./index.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { initSentry } from "@saflib/sentry";
import { start__ServiceName__IdentityService } from "template-package-identity";

validateEnv(process.env, envSchema);
setServiceName("__product-name__");
addLokiTransport();
initSentry();
collectSystemMetrics();

start__ServiceName__IdentityService();
start__ServiceName__Service();
