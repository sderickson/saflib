import { describe, expect, it } from "vitest";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import { runWorkflow } from "@saflib/workflows";

describe("openapi/add-schema", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSchemaWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
