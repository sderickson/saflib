import { describe, expect, it } from "vitest";
import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("spec-project", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(SpecProjectWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
