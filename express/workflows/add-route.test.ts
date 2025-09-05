import { describe, expect, it } from "vitest";
import { AddRouteWorkflow } from "./add-route.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-route", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddRouteWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
