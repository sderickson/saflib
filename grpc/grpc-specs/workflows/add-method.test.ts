import { describe, expect, it } from "vitest";
import { AddMethodWorkflowDefinition } from "./add-method.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-method", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow(AddMethodWorkflowDefinition, "dry");
    expect(result.checklist).toBeDefined();
  });
});
