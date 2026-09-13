import { describe, it, expect } from "vitest";
import * as exports from "@saflib/new-workflows-spec";
import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";

describe("new-workflows-spec", () => {
  it("should be defined", () => {
    expect(exports).toBeDefined();
  });

  it("types a config-defined workflow body", () => {
    const body: WorkflowConfigBody = {
      name: "Add a demo feature flag",
      steps: [
        { kind: "prompt", prompt: "Review the plan before continuing." },
        {
          kind: "command",
          command: "npm",
          args: ["run", "typecheck"],
          ignoreError: false,
          forceInScript: false,
        },
        { kind: "call-workflow", workflowId: "example/hello", input: { name: "example-thing" } },
      ],
    };
    expect(body.steps).toHaveLength(3);
  });
});
