import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddComponentWorkflowDefinition } from "./add-component.ts";

function findFile(dir: string, suffix: string): string | undefined {
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(suffix)) {
      return path.join(entry.parentPath, entry.name);
    }
  }
  return undefined;
}

describe("sdk/add-component (ported to the new engine)", () => {
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

  it("copies component templates with name substitution applied", async () => {
    // `context()` derives the required package-name suffix from the cwd's
    // own (short, generic) directory name — e.g. cwd's leaf dir is "sdk"
    // and the package name ends "...-sdk" — so the same workflow works for
    // both sdk and spa packages. Reproduce the real convention
    // (`<product>/service/sdk`) rather than mkdtemp's random-suffixed leaf.
    const root = mkdtempSync(path.join(tmpdir(), "sdk-add-component-"));
    const cwd = path.join(root, "service", "sdk");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-sdk" }, null, 2),
    );

    const runId = await createRun(dbKey, AddComponentWorkflowDefinition, {
      input: { path: "./displays/contact-card" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddComponentWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const vueFile = findFile(cwd, ".vue");
    expect(vueFile).toBeDefined();
    const content = readFileSync(vueFile!, "utf-8");
    expect(content).not.toContain("__");
  });

  it("threads a passed prompt into both update steps' own prompt text", () => {
    const root = mkdtempSync(path.join(tmpdir(), "sdk-add-component-"));
    const cwd = path.join(root, "service", "sdk");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-sdk" }, null, 2),
    );

    const context = AddComponentWorkflowDefinition.context({
      input: { path: "./displays/contact-card", prompt: "a card showing a contact's name and email" },
      cwd,
    });
    const [, vueUpdateStep, testUpdateStep] = AddComponentWorkflowDefinition.steps;
    const vueInput = vueUpdateStep.input({ context }) as { prompt: string };
    const testInput = testUpdateStep.input({ context }) as { prompt: string };
    expect(vueInput.prompt).toContain("Task: a card showing a contact's name and email");
    expect(testInput.prompt).toContain("It implements: a card showing a contact's name and email");
  });
});
