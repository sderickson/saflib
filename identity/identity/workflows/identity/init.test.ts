import { describe, expect, it } from "vitest";
import { Identity/initWorkflowDefinition } from "./identity/init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("identity/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow(Identity/initWorkflowDefinition, "dry");
    expect(result.checklist).toBeDefined();
  });
});
