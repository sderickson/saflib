import { describe, expect, it } from "vitest";
import { InitCommonWorkflowDefinition } from "./init-common.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init-common", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitCommonWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
