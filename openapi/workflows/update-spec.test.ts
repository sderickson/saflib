import { describe, expect, it } from "vitest";
import { UpdateSpecWorkflow } from "./update-spec.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("update-spec", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(UpdateSpecWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
