import { describe, it } from "vitest";
import { InitServiceWorkflowDefinition } from "./init.ts";
import { runWorkflow } from "@saflib/workflows";

describe("init", () => {
  it("should successfully dry run", async () => {
    await runWorkflow({
      definition: InitServiceWorkflowDefinition,
      runMode: "checklist",
    });
  });
});
