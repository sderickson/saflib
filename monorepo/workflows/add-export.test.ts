import { describe, expect, it } from "vitest";
import { AddExportWorkflowDefinition } from "./add-export.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-export", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddExportWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
