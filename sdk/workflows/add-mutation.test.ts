import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-mutation", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSdkMutationWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });

  it("targets requests/<group>/ (not the sdk package root)", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "sdk-add-mutation-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      '{\n  "name": "@saflib/fixture-sdk"\n}\n',
    );

    const context = AddSdkMutationWorkflowDefinition.context({
      input: {
        path: "./requests/todo/create.ts",
        urlPath: "/todos",
        method: "post",
        cwd,
      },
    });

    expect(context.targetDir).toBe(path.join(cwd, "requests", "todo"));
    expect(context.groupName).toBe("todo");
    expect(context.targetName).toBe("create");
  });
});
