import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import path from "node:path";
import { pollingWaitFor } from "../utils.ts";
import { CdStepMachine } from "./cd.ts";
import {
  isPendingCopyPackageRoot,
  validateCdTarget,
} from "./cd-validation.ts";

describe("cd-validation", () => {
  it("detects pending copy package roots", () => {
    const pkgRoot = path.join("/tmp", "new-db");
    expect(
      isPendingCopyPackageRoot(pkgRoot, {
        packageJson: path.join(pkgRoot, "package.json"),
        index: path.join(pkgRoot, "index.ts"),
      }),
    ).toBe(true);
    expect(isPendingCopyPackageRoot(pkgRoot, {})).toBe(false);
    expect(
      isPendingCopyPackageRoot("/other", {
        packageJson: path.join(pkgRoot, "package.json"),
      }),
    ).toBe(false);
  });

  it("throws in dry mode when the target directory does not exist", () => {
    expect(() =>
      validateCdTarget("/nonexistent/package/path", "dry", undefined),
    ).toThrow(/does not exist/);
  });

  it("allows missing directories in dry mode when copy would create them", () => {
    const pkgRoot = path.join("/tmp", "pending-db");
    expect(() =>
      validateCdTarget(pkgRoot, "dry", {
        packageJson: path.join(pkgRoot, "package.json"),
      }),
    ).not.toThrow();
  });
});

describe("CdStepMachine", () => {
  const repoRoot = path.resolve(import.meta.dirname, "../../../..");
  const jobsSpec = path.join(repoRoot, "saflib/jobs/jobs-spec");

  it("fails in dry mode when cd target does not exist", () => {
    const plansCwd = path.join(repoRoot, "daemon/plans");
    expect(() =>
      validateCdTarget(
        path.join(plansCwd, "../../../saflib/jobs/jobs-spec"),
        "dry",
        undefined,
      ),
    ).toThrow(/does not exist/);
  });

  it("succeeds in dry mode when cd target is an existing package", async () => {
    const actor = createActor(CdStepMachine, {
      input: {
        path: "saflib/jobs/jobs-spec",
        originalWorkingDirectory: repoRoot,
        runMode: "dry",
      },
    });

    actor.start();
    await pollingWaitFor(actor, (state) => state.status === "done");
    expect(actor.getSnapshot().output?.newCwd).toBe(jobsSpec);
  });

  it("succeeds in dry mode for pending copy destinations", async () => {
    const pendingRoot = path.join("/tmp", "workflow-pending-package");
    const actor = createActor(CdStepMachine, {
      input: {
        path: pendingRoot,
        runMode: "dry",
        copiedFiles: {
          packageJson: path.join(pendingRoot, "package.json"),
        },
      },
    });

    actor.start();
    await pollingWaitFor(actor, (state) => state.status === "done");
    expect(actor.getSnapshot().output?.newCwd).toBe(pendingRoot);
  });
});
