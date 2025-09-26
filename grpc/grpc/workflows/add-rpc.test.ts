import { describe, expect, it } from "vitest";
import { AddRpcWorkflowDefinition } from "./add-rpc.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-rpc", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddRpcWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
