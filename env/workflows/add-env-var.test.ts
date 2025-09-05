import { describe, expect, it } from "vitest";
import { AddEnvVarWorkflow } from "./add-env-var.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-env-var", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddEnvVarWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
