import { describe, expect, it } from "vitest";
import { AddSpaViewWorkflowDefinition } from "./add-view.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-spa-view", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSpaViewWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
