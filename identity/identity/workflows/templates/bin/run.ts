#!/usr/bin/env node
import { startIdentityService } from "@saflib/identity";
import { callbacks } from "../callbacks.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "../env.schema.combined.json" with { type: "json" };
import path from "path";

validateEnv(process.env, envSchema);
setServiceName("identity");
addLokiTransport();
collectSystemMetrics();

const dbPath = path.join(import.meta.dirname, "..", "data", "identity.db");

startIdentityService({
  dbPath,
  callbacks,
});
