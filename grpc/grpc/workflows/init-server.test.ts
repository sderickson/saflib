import { describe, expect, it } from "vitest";
import { InitGrpcServerWorkflowDefinition } from "./init-server.ts";
import { runWorkflow } from "@saflib/workflows";

describe("grpc/init-server", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitGrpcServerWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
