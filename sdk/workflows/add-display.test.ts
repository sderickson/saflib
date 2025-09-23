import { describe, expect, it } from "vitest";
import { AddDisplayWorkflowDefinition } from "./add-display.ts";
import { runWorkflow } from "@saflib/workflows";

describe("sdk/add-display", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddDisplayWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
