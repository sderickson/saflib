import { describe, expect, it } from "vitest";
import { VueAddStaticSiteWorkflowDefinition } from "./add-static-site.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-static-site", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: VueAddStaticSiteWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
