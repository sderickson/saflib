import { describe, expect, it } from "vitest";
import { CronInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: CronInitWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
