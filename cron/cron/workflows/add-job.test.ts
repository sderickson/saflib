import { describe, expect, it } from "vitest";
import { CronAddJobWorkflowDefinition } from "./add-job.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-job", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: CronAddJobWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
