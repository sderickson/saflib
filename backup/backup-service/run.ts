#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { startBackupService } from "./index.ts";

validateEnv(process.env, envSchema);
setServiceName("backup");
addLokiTransport();
collectSystemMetrics();

startBackupService();
