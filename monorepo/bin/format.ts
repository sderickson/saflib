#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "child_process";

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: npm exec saf-format <filename>");
  process.exit(1);
}

const fileName = args[0];

execSync(`prettier --write ${fileName}`);
