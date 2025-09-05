import { describe, expect, it } from "vitest";
import { AddEmailTemplateWorkflow } from "./add-email-template.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-email-template", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddEmailTemplateWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
