#!/usr/bin/env -S node --experimental-strip-types

// Run `TZ=UTC vitest run --coverage` in the current directory
// and tee the output to a file.

import { Command } from "commander";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-test-coverage")
  .description("Wrapper around vitest coverage")
  .option("-c, --capture-log", "Capture the log output - but TTY is lost!")
  .action(async (options) => {
    const captureLog = options.captureLog;
    if (!captureLog) {
      throw new Error("Capture log is required");
    }
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
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
      });
    }

    await new Promise<void>((resolve, reject) => {
      child.on("close", async (code) => {
        if (code === 0) {
          try {
            if (captureLog) {
              if (!stdout) {
                throw new Error("No stdout, but capture log is enabled");
              }
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

setupContext({ serviceName: "saf-test-coverage" }, () => {
  program.parse(process.argv);
});
