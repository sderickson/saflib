import { describe, expect, it } from "vitest";
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-e2e-test", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddE2eTestWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
