#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Live-test CLI: copy golden product → tmp, run named workflow sets in script
 * mode, typecheck after each set, tear down.
 *
 *   npm run live-test              # all sets
 *   npm run live-test list         # set names
 *   npm run live-test drizzle      # one set
 *   npm run live-test openapi vue  # several sets
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runWorkflow } from "@saflib/workflows";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../workflows/core/store.ts";
import { buildLiveTestWorkflow } from "./live-test/build.ts";
import {
  listLiveTestSetNames,
  liveTestSets,
} from "./live-test/sets.ts";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const cleanupScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "cleanup-product-init-artifacts.ts",
);

function printList(): void {
  console.log("Live-test sets:\n");
  for (const set of liveTestSets) {
    console.log(`  ${set.name.padEnd(12)} ${set.description}`);
  }
  console.log(`\nUsage:
  npm run live-test              # all sets
  npm run live-test list
  npm run live-test <set> [<set>...]
`);
}

function cleanupLiveTestArtifacts(): void {
  console.log("Cleaning live-test artifacts…");
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      cleanupScript,
    ],
    { cwd: saflibRoot, stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error("Live-test cleanup failed");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "list" || args[0] === "--list" || args[0] === "-l") {
    printList();
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    printList();
    return;
  }

  const unknown = args.filter((a) => !listLiveTestSetNames().includes(a));
  if (unknown.length > 0) {
    console.error(
      `Unknown set(s): ${unknown.join(", ")}\nKnown: ${listLiveTestSetNames().join(", ")}`,
    );
    process.exit(1);
  }

  process.chdir(saflibRoot);

  // Keep golden saflib/deploy/ read-only; init/add-* write here instead.
  process.env.SAF_DEPLOY_DIR = "tmp-deploy";

  const log = createWorkflowLogger();
  setupWorkflowContext({
    logger: log,
    getSourceUrl: (p) => p,
  });

  const definition = buildLiveTestWorkflow({
    sets: args.length > 0 ? args : undefined,
  });

  const label = args.length > 0 ? args.join(", ") : "all";
  console.log(`Live-test: ${label}`);

  let failed = false;
  try {
    const { output } = await runWorkflow({
      definition,
      runMode: "script",
    });

    if (!output) {
      console.error("Live-test did not complete successfully");
      failed = true;
    } else {
      console.log("Live-test completed successfully");
    }
  } catch (err) {
    console.error(err);
    failed = true;
  } finally {
    // Always undo saflib-root mutations (package.json workspaces, scaffold CI,
    // tmp/, unit-tests workflow area) — including when the suite fails mid-way.
    cleanupLiveTestArtifacts();
  }

  if (failed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  cleanupLiveTestArtifacts();
  process.exit(1);
});
