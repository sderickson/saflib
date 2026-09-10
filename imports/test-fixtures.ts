import path from "node:path";
import { fileURLToPath } from "node:url";

/** Shared mini-monorepo fixture (lives under `@saflib/monorepo`). */
export const miniMonorepoFixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../monorepo/fixtures/mini-monorepo",
);
