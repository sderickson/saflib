#!/usr/bin/env node --experimental-strip-types

// Run `TZ=UTC vitest run --coverage` in the current directory
// and tee the output to a file.

import { Command } from "commander";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";

const program = new Command()
  .name("saf-test-coverage")
  .description("Wrapper around vitest coverage")
  .option("-c, --capture-log", "Capture the log output - but TTY is lost!")
  .action(async (options) => {
    const captureLog = options.captureLog;
    const coverageFile = "./coverage/coverage-log.txt";

    const child = spawn("vitest", ["run", "--coverage"], {
      env: {
        ...process.env,
        TZ: "UTC",
      },
      stdio: ["inherit", captureLog ? "pipe" : "inherit", "inherit"],
    });

    let stdout = "";
    if (captureLog && child.stdout) {
      child.stdout.pipe(process.stdout);
      process.stdout.on("data", (data) => {
        console.log("GOT DATA", data);
        const chunk = data.toString();
        stdout += chunk;
      });
    }

    await new Promise<void>((resolve, reject) => {
      child.on("close", async (code) => {
        if (code === 0) {
          try {
            if (captureLog) {
              await writeFile(coverageFile, stdout);
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on("error", reject);
    });

    process.exit(0);
  });

program.parse(process.argv);
