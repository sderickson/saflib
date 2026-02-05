import { describe, expect, it } from "vitest";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-mutation", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSdkMutationWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
