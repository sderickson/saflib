import { describe, expect, it } from "vitest";
import { AddDrizzleQueryWorkflowDefinition } from "./add-query.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-queries", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddDrizzleQueryWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
