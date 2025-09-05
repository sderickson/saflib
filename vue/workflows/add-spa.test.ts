import { describe, it } from "vitest";
import { AddSpaWorkflow } from "./add-spa.ts";
import { dryRunWorkflow } from "../../workflows/saf-workflow-cli/utils.ts";

describe("add-spa", () => {
  it("should successfully dry run", async () => {
    await dryRunWorkflow(AddSpaWorkflow);
  });
});
