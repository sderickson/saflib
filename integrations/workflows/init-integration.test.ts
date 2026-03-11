import { describe, expect, it } from "vitest";
import { InitIntegrationWorkflowDefinition } from "./init-integration.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init-integration", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitIntegrationWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
