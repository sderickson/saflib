#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { startTmpService } from "./index.ts";

validateEnv(process.env, envSchema);
setServiceName("tmp");
addLokiTransport();
collectSystemMetrics();

startTmpService();
