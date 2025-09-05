import { describe, expect, it } from "vitest";
import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-queries", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddQueryWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
