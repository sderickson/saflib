import { describe, expect, it } from "vitest";
import { UpdateSchemaWorkflow } from "./update-schema.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("update-schema", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(UpdateSchemaWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
