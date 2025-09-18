import { describe, expect, it } from "vitest";
import { TemplateFileWorkflowDefinition } from "./template-file.ts";
import { runWorkflow } from "@saflib/workflows";

describe("template-file", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: TemplateFileWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.checklist).toBeDefined();
  });
});
