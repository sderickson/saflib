import { describe, expect, it } from "vitest";
import { TemplateFileWorkflowDefinition } from "./template-file.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("template-file", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(TemplateFileWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
