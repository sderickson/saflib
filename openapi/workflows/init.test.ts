import { describe, expect, it } from "vitest";
import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("openapi/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: OpenapiInitWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
