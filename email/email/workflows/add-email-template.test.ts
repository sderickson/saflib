import { describe, expect, it } from "vitest";
import { AddEmailTemplateWorkflowDefinition } from "./add-email-template.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-email-template", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddEmailTemplateWorkflowDefinition);
    expect(result.checklist).toBeDefined();
  });
});
