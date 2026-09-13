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
        { kind: "copy", templateFiles: { flag: "templates/flag.ts" }, targetDir: "src/flags" },
        { kind: "update", fileId: "flag" },
        {
          kind: "command",
          command: "npm",
          args: ["run", "typecheck"],
          ignoreError: false,
          forceInScript: false,
        },
      ],
    };
    expect(body.steps).toHaveLength(3);
  });
});
