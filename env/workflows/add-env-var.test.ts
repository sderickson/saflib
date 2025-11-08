import { describe, expect, it } from "vitest";
import { AddEnvVarWorkflowDefinition } from "./add-env-var.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-env-var", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddEnvVarWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
