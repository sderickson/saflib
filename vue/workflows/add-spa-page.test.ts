import { describe, expect, it } from "vitest";
import { AddSpaPageWorkflow } from "./add-spa-page.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-spa-page", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddSpaPageWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
