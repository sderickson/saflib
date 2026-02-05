import { describe, expect, it } from "vitest";
import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import { runWorkflow } from "@saflib/workflows";

describe("spec-project", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: SpecProjectWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
