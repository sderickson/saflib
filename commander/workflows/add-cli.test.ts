import { describe, it, expect } from "vitest";
import { AddCLIWorkflowDefinition } from "./add-cli.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-cli", () => {
  it("should create a new CLI", async () => {
    const result = await runWorkflow({
      definition: AddCLIWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.checklist).toBeDefined();
  });
});
