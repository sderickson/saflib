import { describe, expect, it } from "vitest";
import { AddEmailTemplateWorkflowDefinition } from "./add-email-template.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-email-template", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddEmailTemplateWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
