import { describe, expect, it } from "vitest";
import { ExpressInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("express/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: ExpressInitWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
