import { describe, expect, it } from "vitest";
import { InitClientWorkflowDefinition } from "./init-client.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init-client", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: InitClientWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
