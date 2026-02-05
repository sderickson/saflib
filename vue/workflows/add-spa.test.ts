import { describe, expect, it } from "vitest";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-spa", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSpaWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
