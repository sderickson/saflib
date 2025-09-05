import { describe, expect, it } from "vitest";
import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-ts-package", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddTsPackageWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
