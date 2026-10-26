import { describe, it, expect } from "vitest";
import { unexpectedChangesForGroup } from "./plan-files.ts";

describe("unexpectedChangesForGroup", () => {
  it("keeps the group's changes, ordered by phase file then step", () => {
    const group = {
      folder: "2026-10-01-widgets",
      name: "widgets",
      files: [
        { name: "phase-1.yaml", path: "p/plans/notes/2026-10-01-widgets/phase-1.yaml" },
        { name: "phase-2.yaml", path: "p/plans/notes/2026-10-01-widgets/phase-2.yaml" },
      ],
    };
    const change = (workflow_ref: string, step_index: number) => ({
      workflow_ref,
      run_id: "r",
      step_index,
      files: ["x.ts"],
    });

    const result = unexpectedChangesForGroup(
      [
        change("p/plans/notes/2026-10-01-widgets/phase-2.yaml", 1),
        change("p/plans/notes/other/phase-1.yaml", 0),
        change("p/plans/notes/2026-10-01-widgets/phase-1.yaml", 5),
        change("p/plans/notes/2026-10-01-widgets/phase-1.yaml", 2),
      ],
      group,
    );

    expect(result.map((c) => `${c.workflow_ref.split("/").pop()}:${c.step_index}`)).toEqual([
      "phase-1.yaml:2",
      "phase-1.yaml:5",
      "phase-2.yaml:1",
    ]);
  });
});
