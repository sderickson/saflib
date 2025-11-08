import { describe, expect, it } from "vitest";
import { InitServiceWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitServiceWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
