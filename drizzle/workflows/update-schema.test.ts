import { describe, expect, it } from "vitest";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import { runWorkflow } from "@saflib/workflows";

describe("update-schema", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: UpdateSchemaWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
