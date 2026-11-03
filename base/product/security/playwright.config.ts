/**
 * Playwright specs assert HTTP/browser behavior (headers, CSRF, CORS, authz, etc.).
 * Extend this suite as product surface grows; keep threat-model.md in sync.
 */
import "./test/playwright-env.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSecurityPlaywrightConfig } from "@saflib/security/playwright/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default createSecurityPlaywrightConfig({
  testDir: path.join(dirname, "test"),
});
