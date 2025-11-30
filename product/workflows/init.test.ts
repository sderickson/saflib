import { describe, expect, it } from "vitest";
import { InitProductWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitProductWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
