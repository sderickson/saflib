/**
 * Integration tests for the workflow area API (updateWorkflowAreas, validateWorkflowAreas).
 * Unit tests for parse, find, lines, update, and validate live in core/steps/copy/inline/*.test.ts.
 */
import { describe, it, expect } from "vitest";
import { updateWorkflowAreas, validateWorkflowAreas } from "./inline/index.ts";

describe("inline workflow areas (integration)", () => {
  it("updateWorkflowAreas and validateWorkflowAreas work together for a typical copy-step scenario", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  code2",
      "// END WORKFLOW AREA",
    ];
    const targetLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "// END WORKFLOW AREA",
    ];

    expect(() =>
      validateWorkflowAreas({
        sourceLines,
        targetLines,
        targetPath: "test.ts",
        sourcePath: "template.ts",
      }),
    ).not.toThrow();

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  code2",
      "// END WORKFLOW AREA",
    ]);
  });

  it("validateWorkflowAreas rejects when workflow ID order differs in source vs target (comment style)", () => {
    // Different comment prefix produces different key, so "target does not have" this area
    expect(() =>
      validateWorkflowAreas({
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  code",
          "// END WORKFLOW AREA",
        ],
        targetLines: [
          "# BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  existing",
          "# END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourcePath: "test.ts",
      }),
    ).toThrow();
  });

  it("validateWorkflowAreas passes when workflow ID order differs but area definition matches", () => {
    // Same comment style, same area name/sorted/once/if; only ID order differs and is normalized
    expect(() =>
      validateWorkflowAreas({
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
          "  code",
          "// END WORKFLOW AREA",
        ],
        targetLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow2 workflow1",
          "  existing",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourcePath: "test.ts",
      }),
    ).not.toThrow();
  });
});
