import { describe, expect, it } from "vitest";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import { runWorkflow } from "@saflib/workflows";

describe("express/add-handler", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddHandlerWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
