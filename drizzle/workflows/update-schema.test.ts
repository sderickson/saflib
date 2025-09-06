import { describe, expect, it } from "vitest";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import { dryRunWorkflow } from "@saflib/workflows-internal";

describe("update-schema", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(UpdateSchemaWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
