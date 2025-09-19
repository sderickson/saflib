import { describe, expect, it } from "vitest";
import { IdentityInitWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("identity/init", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: IdentityInitWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
