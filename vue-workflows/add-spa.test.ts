import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";

describe("vue/add-spa (ported to the new engine)", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  it("copies the SPA package stub with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "vue-add-spa-"));
    writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "@example/widgets" }, null, 2));

    const runId = await createRun(dbKey, AddSpaWorkflowDefinition, {
      input: { productName: "widgets", subdomainName: "admin" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step, touching the SPA package dir itself —
    // the later copy steps target dev/deploy Caddy configs and a real
    // installed monorepo tree this test harness doesn't have.
    const { output, result } = advanceRun(dbKey, AddSpaWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const packageJsonPath = path.join(cwd, "widgets", "clients", "admin", "package.json");
    const packageJson = readFileSync(packageJsonPath, "utf-8");
    expect(packageJson).toContain("@example/widgets-admin-spa");
    expect(packageJson).not.toContain("__subdomain-name__");
  });
});
