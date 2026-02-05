import { describe, expect, it } from "vitest";
import { __WorkflowNamespace____TargetName__WorkflowDefinition } from "./__target-name__.ts";
import { runWorkflow } from "@saflib/workflows";

describe("__target-name__", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: __WorkflowNamespace____TargetName__WorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
