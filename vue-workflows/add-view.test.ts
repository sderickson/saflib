import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddSpaViewWorkflowDefinition } from "./add-view.ts";

function findFile(root: string, suffix: string): string | undefined {
  for (const entry of readdirSync(root, { recursive: true }) as string[]) {
    const full = path.join(root, entry);
    if (statSync(full).isFile() && full.endsWith(suffix)) return full;
  }
  return undefined;
}

describe("vue/add-view (ported to the new engine)", () => {
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

  it("copies the view templates with name substitution applied", async () => {
    // cwd is the SPA package dir itself — add-view derives `subdomainName`
    // from its basename and `targetDir` from its parent.
    const spaDir = mkdtempSync(path.join(tmpdir(), "vue-add-view-"));
    const cwd = path.join(spaDir, "admin");
    mkdirSync(cwd);
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-admin-spa" }, null, 2),
    );

    const runId = await createRun(dbKey, AddSpaViewWorkflowDefinition, {
      input: { path: "./pages/welcome-new-user", urlPath: "/welcome-new-user" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — "update"/"prompt"/"command" need a
    // real agent/installed SPA package this test harness doesn't have.
    const { output, result } = advanceRun(dbKey, AddSpaViewWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const vuePath = findFile(cwd, "WelcomeNewUser.vue");
    expect(vuePath).toBeDefined();
    const content = readFileSync(vuePath!, "utf-8");
    expect(content).not.toContain("__TargetName__");
  });
});
