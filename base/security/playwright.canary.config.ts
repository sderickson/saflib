/**
 * Production HTTPS checks (`@canary`): transport, secure cookies, etc.
 * Run from `base/security`: `npm run test:e2e:canary`
 */
import "./playwright-canary-env.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSecurityCanaryPlaywrightConfig } from "@saflib/security/playwright/canary-config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createSecurityCanaryPlaywrightConfig({ testDir: dirname });
