import { describe, expect, it } from "vitest";
import { AddWorkflowDefinition } from "./add-workflow.ts";
import { runWorkflow } from "../index.ts";

describe("add-workflow", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.checklist).toBeDefined();
  });
});
