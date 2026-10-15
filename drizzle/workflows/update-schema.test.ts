import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, existsSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createActor } from "xstate";
import {
  CopyStepMachine,
  makeLineReplace,
  runWorkflow,
  pollingWaitFor,
} from "@saflib/workflows";
import { templatesProductRoot } from "@saflib/templates";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";

const schemaRegistryWeave = path.join(
  templatesProductRoot,
  "service",
  "db",
  "schemas",
  "update-schema-registry",
  "index.ts",
);

describe("update-schema", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: UpdateSchemaWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });

  it("copies the table file under schemas/, not the package root", async () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), "update-schema-"));
    mkdirSync(path.join(targetDir, "schemas"), { recursive: true });
    try {
      const actor = createActor(CopyStepMachine, {
        input: {
          workflowId: "drizzle/update-schema",
          templateFiles: UpdateSchemaWorkflowDefinition.templateFiles,
          targetDir,
          name: "user",
          lineReplace: makeLineReplace({
            groupName: "user",
            targetName: "user",
          }),
        },
      });
      actor.start();
      await pollingWaitFor(actor, (snapshot) => snapshot.value === "done");

      expect(actor.getSnapshot().value).toBe("done");
      expect(existsSync(path.join(targetDir, "schemas/user.ts"))).toBe(true);
      expect(existsSync(path.join(targetDir, "user.ts"))).toBe(false);
      expect(existsSync(path.join(targetDir, "schema.ts"))).toBe(true);
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("weaves schemas/index.ts when that barrel exists", async () => {
    const targetDir = mkdtempSync(path.join(os.tmpdir(), "update-schema-"));
    mkdirSync(path.join(targetDir, "schemas"), { recursive: true });
    writeFileSync(
      path.join(targetDir, "schemas", "index.ts"),
      `// BEGIN WORKFLOW AREA schema-exports FOR drizzle/update-schema
// END WORKFLOW AREA
`,
    );
    try {
      const actor = createActor(CopyStepMachine, {
        input: {
          workflowId: "drizzle/update-schema",
          templateFiles: {
            index: schemaRegistryWeave,
          },
          targetDir: path.join(targetDir, "schemas"),
          name: "contact",
          lineReplace: makeLineReplace({
            groupName: "contact",
            targetName: "contact",
          }),
          skipUnlessPathExists: path.join(targetDir, "schemas", "index.ts"),
        },
      });
      actor.start();
      await pollingWaitFor(actor, (snapshot) => snapshot.value === "done");

      const index = readFileSync(path.join(targetDir, "schemas", "index.ts"), "utf-8");
      expect(index).toContain('export * from "./contact.ts";');
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
