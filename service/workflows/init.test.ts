import { describe, expect, it } from "vitest";
import { InitWorkflowDefinition } from "./init.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(InitWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
