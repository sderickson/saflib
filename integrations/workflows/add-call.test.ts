import { describe, expect, it } from "vitest";
import { AddCallWorkflowDefinition } from "./add-call.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-call", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddCallWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
