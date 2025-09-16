import { describe, expect, it } from "vitest";
import { SdkInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("sdk/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow(SdkInitWorkflowDefinition, "dry");
    expect(result.checklist).toBeDefined();
  });
});
