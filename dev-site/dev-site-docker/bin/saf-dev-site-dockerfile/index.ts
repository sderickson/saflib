#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { resolveDevSiteDockerfilePath } from "../../src/dockerfile-path.ts";

try {
  console.log(resolveDevSiteDockerfilePath());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
