import { describe, expect, it } from "vitest";
import { InitGrpcClientWorkflowDefinition } from "./init-client.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init-client", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitGrpcClientWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
