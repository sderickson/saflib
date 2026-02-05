import { describe, expect, it } from "vitest";
import { AddProtoWorkflowDefinition } from "./add-proto.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-proto", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddProtoWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
