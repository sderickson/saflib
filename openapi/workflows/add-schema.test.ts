import { describe, expect, it } from "vitest";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";
import { runWorkflow } from "@saflib/workflows";

describe("openapi/add-schema", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: OpenApiSchemaWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
