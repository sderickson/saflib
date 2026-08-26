import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-query", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSdkQueryWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });

  it("targets requests/<group>/ (not the sdk package root)", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "sdk-add-query-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      '{\n  "name": "@saflib/fixture-sdk"\n}\n',
    );

    const context = AddSdkQueryWorkflowDefinition.context({
      input: {
        path: "./requests/todo/list.ts",
        urlPath: "/todos",
        method: "get",
        cwd,
      },
    });

    expect(context.targetDir).toBe(path.join(cwd, "requests", "todo"));
    expect(context.groupName).toBe("todo");
    expect(context.targetName).toBe("list");
  });
});
