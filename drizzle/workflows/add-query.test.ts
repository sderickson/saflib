import { describe, expect, it } from "vitest";
import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-queries", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddQueryWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
