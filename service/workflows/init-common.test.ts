import { describe, expect, it } from "vitest";
import { InitCommonWorkflowDefinition } from "./init-common.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("init-common", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(InitCommonWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
