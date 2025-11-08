import { describe, expect, it } from "vitest";
import { AddGrpcServerHandlerWorkflowDefinition } from "./add-handler.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-handler", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddGrpcServerHandlerWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
