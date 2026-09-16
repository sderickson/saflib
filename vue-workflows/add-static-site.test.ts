import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddStaticSiteWorkflowDefinition } from "./add-static-site.ts";

describe("vue/add-static-site (ported to the new engine)", () => {
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

  it("copies the static site package stub with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "vue-add-static-site-"));
    writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "@example/widgets" }, null, 2));

    const runId = await createRun(dbKey, AddStaticSiteWorkflowDefinition, {
      input: { productName: "widgets", subdomainName: "docs" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step, touching the static site package dir
    // itself — the later copy steps target dev/deploy Caddy/Docker configs
    // and a real installed monorepo tree this test harness doesn't have.
    const { output, result } = advanceRun(dbKey, AddStaticSiteWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const packageJsonPath = path.join(cwd, "widgets", "clients", "docs", "package.json");
    const packageJson = readFileSync(packageJsonPath, "utf-8");
    expect(packageJson).toContain("@example/widgets-docs-static");
    expect(packageJson).not.toContain("__static-subdomain-name__");
  });
});
