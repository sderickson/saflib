import { describe, expect, it } from "vitest";
import { SdkInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("sdk/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: SdkInitWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
