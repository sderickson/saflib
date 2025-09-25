import { describe, expect, it } from "vitest";
import { AddComponentWorkflowDefinition } from "./add-component.ts";
import { runWorkflow } from "@saflib/workflows";

describe("sdk/add-component", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddComponentWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
