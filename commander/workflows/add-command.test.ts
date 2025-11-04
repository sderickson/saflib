import { describe, expect, it } from "vitest";
import { AddCommandWorkflowDefinition } from "./add-command.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-command", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddCommandWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
