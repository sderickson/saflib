import { describe, expect, it } from "vitest";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-query", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSdkQueryWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
