import { describe, expect, it } from "vitest";
import { AddEnvVarWorkflowDefinition } from "./add-env-var.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-env-var", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddEnvVarWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
