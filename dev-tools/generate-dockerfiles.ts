#!/usr/bin/env node --experimental-strip-types
import { generateDockerfiles } from "./src/docker.ts";
import { buildMonorepoContext } from "./src/workspace.ts";
const args = process.argv.slice(2);
const path = args[0];
if (!path) {
  console.error("--------------------------------");
  console.error("Path is required");
  console.error("--------------------------------");
  process.exit(1);
}

const monorepoContext = buildMonorepoContext(path);
generateDockerfiles(monorepoContext, true);
