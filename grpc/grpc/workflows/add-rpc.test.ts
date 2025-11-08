import { describe, expect, it } from "vitest";
import { AddGrpcCallWorkflowDefinition } from "./add-rpc.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-rpc", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddGrpcCallWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
