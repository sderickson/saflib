import { describe, expect, it } from "vitest";
import { AddCommandWorkflow } from "./add-command.ts";
import { dryRunWorkflow } from "@saflib/workflows";

describe("add-command", () => {
  it("should successfully dry run", async () => {
    const result = await dryRunWorkflow(AddCommandWorkflow);
    expect(result.checklist).toBeDefined();
  });
});
