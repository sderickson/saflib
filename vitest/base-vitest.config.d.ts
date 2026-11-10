// Types for base-vitest.config.js, so TypeScript configs (vitest.config.ts)
// can import it: `import { defaultMaxWorkers } from "@saflib/vitest/vitest.config.js"`.
import type { ViteUserConfig } from "vitest/config";

/** At most 4 workers; see base-vitest.config.js. */
export declare const defaultMaxWorkers: number;

/** The shared package test config. */
export declare const defaultConfig: ViteUserConfig;
