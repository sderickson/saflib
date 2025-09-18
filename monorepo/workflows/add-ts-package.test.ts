import { describe, expect, it } from "vitest";
import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-ts-package", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddTsPackageWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.checklist).toBeDefined();
  });
});
