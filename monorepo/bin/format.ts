#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "child_process";

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: npm exec saf-format <filename>");
  process.exit(1);
}

const fileName = args[0];

if (fileName === "help") {
  // Since this command isn't using commander, but saf-docs expects it to be, handle
  // the standard commander help command.
  console.log("Usage: npm exec saf-format <filename>");
  process.exit(0);
}

try {
  execSync(`prettier --write ${fileName}`);
} catch (error) {
  console.error(`Error formatting ${fileName}:`, error);
  console.trace();
  process.exit(1);
}
