#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectSystemMetrics, setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "../../../dev-site-http/env.schema.combined.json" with { type: "json" };
import { startDevSiteService, typedEnv } from "./index.ts";

validateEnv(process.env, envSchema);
setServiceName("dev-site");
collectSystemMetrics();

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(packageDir, "data", "dev-site.sqlite");

await startDevSiteService(typedEnv, {
  defaultDbPath,
  logLabel: "dev-site",
});
