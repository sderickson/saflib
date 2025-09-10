import { describe, expect, it } from "vitest";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("openapi/add-schema", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddSchemaWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
