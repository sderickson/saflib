import { describe, expect, it } from "vitest";
import { AddSpaWorkflow } from "./add-spa.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-spa", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddSpaWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
