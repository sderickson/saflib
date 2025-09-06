import { describe, expect, it } from "vitest";
import { AddCommandWorkflowDefinition } from "./add-command.ts";
import { dryRunWorkflow } from "@saflib/workflows-internal";

describe("add-command", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddCommandWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
