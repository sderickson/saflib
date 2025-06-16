#!/usr/bin/env node --experimental-strip-types

// Run `TZ=UTC vitest run --coverage` in the current directory
// and tee the output to a file.

import { exec } from "child_process";

const coverageFile = "./coverage-log.txt";
console.log("running coverage...");

exec(`TZ=UTC vitest run --coverage | tee ${coverageFile}`);
