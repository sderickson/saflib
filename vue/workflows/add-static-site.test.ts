import { describe, expect, it } from "vitest";
import { AddStaticSiteWorkflowDefinition } from "./add-static-site.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-static-site", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddStaticSiteWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
