import { describe, expect, it } from "vitest";
import { AddRouteWorkflowDefinition } from "./add-route.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-route", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddRouteWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
