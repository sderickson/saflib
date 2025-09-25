import { describe, expect, it } from "vitest";
import { InitGrpcProtoWorkflowDefinition } from "./init-proto.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitGrpcProtoWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
