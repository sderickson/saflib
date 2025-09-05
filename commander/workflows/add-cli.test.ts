import { describe, it, expect } from "vitest";
import { AddCLIWorkflowDefinition } from "./add-cli.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-cli", () => {
  it("should create a new CLI", async () => {
    const result = await dryRunWorkflow(AddCLIWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
