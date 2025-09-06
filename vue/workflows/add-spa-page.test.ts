import { describe, expect, it } from "vitest";
import { AddSpaPageWorkflowDefinition } from "./add-spa-page.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-spa-page", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddSpaPageWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
