import { describe, expect, it } from "vitest";
import { AddTsPackageWorkflow } from "./add-ts-package.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-ts-package", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddTsPackageWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
