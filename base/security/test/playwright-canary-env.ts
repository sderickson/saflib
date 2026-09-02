import { applyProductionCanaryEnv } from "@saflib/security/playwright/env";

applyProductionCanaryEnv(process.env.DOMAIN ?? "example.com");
