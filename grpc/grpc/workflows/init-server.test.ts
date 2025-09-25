import { describe, expect, it } from "vitest";
import { InitWorkflowDefinition } from "./init-server.ts";
import { runWorkflow } from "@saflib/workflows";

describe("grpc/init-server", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
