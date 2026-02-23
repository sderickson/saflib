import { describe, expect, it } from "vitest";
import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-store", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: ServiceAddStoreWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
