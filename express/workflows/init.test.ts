import { describe, expect, it } from "vitest";
import { ExpressInitWorkflowDefinition } from "./init.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("express/init", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(ExpressInitWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
