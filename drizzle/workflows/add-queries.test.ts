import { describe, expect, it } from "vitest";
import { AddQueriesWorkflow } from "./add-queries.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-queries", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddQueriesWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
