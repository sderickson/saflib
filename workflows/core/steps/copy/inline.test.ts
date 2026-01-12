import { describe, it, expect } from "vitest";
import { updateWorkflowAreas } from "./inline.ts";

describe("updateWorkflowAreas", () => {
  it("should append content when workflow ID matches", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "// END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  const code = 'hello';",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not modify when workflow ID does not match", () => {
    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines: [...targetLines],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  new code",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow2",
      lineReplace: (line) => line,
    });

    expect(result).toEqual(targetLines);
  });

  it("should transform lines using lineReplace", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "// END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  template-code",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line.replace("template", "actual"),
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  actual-code",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle multiple areas and different comment styles", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA area1 FOR workflow1",
        "// END WORKFLOW AREA",
        "# BEGIN WORKFLOW AREA area2 FOR workflow1",
        "# END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA area1 FOR workflow1",
        "  code1",
        "// END WORKFLOW AREA",
        "# BEGIN WORKFLOW AREA area2 FOR workflow1",
        "  code2",
        "# END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "# BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  code2",
      "# END WORKFLOW AREA",
    ]);
  });

  describe("non-sorted areas - sequence matching", () => {
    it("should not add if entire sequence exists consecutively", () => {
      const targetLines = [
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  line1",
        "  line2",
        "  line3",
        "// END WORKFLOW AREA",
      ];

      const result = updateWorkflowAreas({
        targetLines: [...targetLines],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  line1",
          "  line2",
          "  line3",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual(targetLines);
    });

    it("should add all lines if sequence doesn't exist consecutively", () => {
      const result = updateWorkflowAreas({
        targetLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  line1",
          "  other",
          "  line2",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  line1",
          "  line2",
          "  line3",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual([
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  line1",
        "  other",
        "  line2",
        "  line1",
        "  line2",
        "  line3",
        "// END WORKFLOW AREA",
      ]);
    });

    it("should preserve duplicate lines in source", () => {
      const result = updateWorkflowAreas({
        targetLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  duplicate",
          "  unique",
          "  duplicate",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual([
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  duplicate",
        "  unique",
        "  duplicate",
        "// END WORKFLOW AREA",
      ]);
    });

    it("should preserve empty/whitespace lines", () => {
      const result = updateWorkflowAreas({
        targetLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN WORKFLOW AREA myArea FOR workflow1",
          "  code",
          "",
          "  ",
          "  more",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual([
        "// BEGIN WORKFLOW AREA myArea FOR workflow1",
        "  code",
        "",
        "  ",
        "  more",
        "// END WORKFLOW AREA",
      ]);
    });
  });

  describe("sorted areas", () => {
    it("should sort lines and deduplicate individually", () => {
      const result = updateWorkflowAreas({
        targetLines: [
          "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
          "  apple",
          "  monkey",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
          "  zebra",
          "  apple",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual([
        "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
        "  apple",
        "  monkey",
        "  zebra",
        "// END WORKFLOW AREA",
      ]);
    });

    it("should remove empty/whitespace lines", () => {
      const result = updateWorkflowAreas({
        targetLines: [
          "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
          "  monkey",
          "  ",
          "// END WORKFLOW AREA",
        ],
        targetPath: "test.ts",
        sourceLines: [
          "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
          "  zebra",
          "",
          "  apple",
          "// END WORKFLOW AREA",
        ],
        workflowId: "workflow1",
        lineReplace: (line) => line,
      });

      expect(result).toEqual([
        "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
        "  apple",
        "  monkey",
        "  zebra",
        "// END WORKFLOW AREA",
      ]);
    });
  });

  it("should handle multiple areas modifying the file", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA area1 FOR workflow1",
        "  existing1",
        "// END WORKFLOW AREA",
        "// BEGIN WORKFLOW AREA area2 FOR workflow1",
        "// END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA area1 FOR workflow1",
        "  new1",
        "// END WORKFLOW AREA",
        "// BEGIN WORKFLOW AREA area2 FOR workflow1",
        "  new2",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  existing1",
      "  new1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  new2",
      "// END WORKFLOW AREA",
    ]);
  });
});
