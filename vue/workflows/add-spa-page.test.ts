import { describe, expect, it } from "vitest";
import { AddSpaPageWorkflowDefinition } from "./add-spa-page.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-spa-page", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSpaPageWorkflowDefinition,
      runMode: "dry",
    });
    expect(result?.checklist).toBeDefined();
  });
});
