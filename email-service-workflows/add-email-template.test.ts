import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddEmailTemplateWorkflowDefinition } from "./add-email-template.ts";

describe("email/add-template (ported to the new engine)", () => {
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

  it("copies the email template with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "email-add-template-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-email" }, null, 2),
    );

    const runId = await createRun(dbKey, AddEmailTemplateWorkflowDefinition, {
      input: { path: "./emails/weekly-report.ts" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddEmailTemplateWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const templatePath = path.join(cwd, "emails", "weekly-report.ts");
    expect(readFileSync(templatePath, "utf-8")).toContain("weeklyReport");
  });
});
