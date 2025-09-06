import { describe, expect, it } from "vitest";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { dryRunWorkflow } from "@saflib/workflows-internal";

describe("add-spa", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddSpaWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
