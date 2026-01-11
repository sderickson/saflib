import { describe, it, expect } from "vitest";
import { updateWorkflowAreas } from "./inline.ts";

describe("updateWorkflowAreas", () => {
  it("should append transformed content to target area when workflow ID matches", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      "  const sourceCode = 'hello';",
      "  const anotherLine = 'world';",
      "// END WORKFLOW AREA",
      "other code",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      "// END WORKFLOW AREA",
      "existing code after",
    ];

    const lineReplace = (line: string) => line.replace("source", "target");

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      "  const targetCode = 'hello';",
      "  const anotherLine = 'world';",
      "// END WORKFLOW AREA",
      "existing code after",
    ]);
  });

  it("should not modify target area when workflow ID does not match", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      "  const sourceCode = 'hello';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      "  existing content",
      "// END WORKFLOW AREA",
    ];

    const originalTargetLines = [...targetLines];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow3", // Not in the list
      lineReplace: (line) => line,
    });

    // Should not modify input
    expect(targetLines).toEqual(originalTargetLines);
    // Should return unchanged result
    expect(result).toEqual(originalTargetLines);
  });

  it("should handle multiple workflow areas in the same file", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code from area1",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow2",
      "  code from area2",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow2",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code from area1",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow2",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle different comment styles", () => {
    const sourceLines = [
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  python code here",
      "# END WORKFLOW AREA",
    ];

    const targetLines = [
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "# END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.py",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  python code here",
      "# END WORKFLOW AREA",
    ]);
  });

  it("should transform lines using lineReplace function", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  template-name code",
      "  more template-name",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "// END WORKFLOW AREA",
    ];

    const lineReplace = (line: string) =>
      line.replace(/template-name/g, "actual-name");

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  actual-name code",
      "  more actual-name",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle areas with multiple workflow IDs", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA sharedArea FOR workflow1 workflow2 workflow3",
      "  shared code",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA sharedArea FOR workflow1 workflow2 workflow3",
      "// END WORKFLOW AREA",
    ];

    // Should work for any of the listed workflows
    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow2",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA sharedArea FOR workflow1 workflow2 workflow3",
      "  shared code",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not duplicate lines that already exist in the target area", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "  const code2 = 'world';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should only add code2, not duplicate code1
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "  const code2 = 'world';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not add any lines if all transformed lines already exist", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "  const code2 = 'world';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "  const code2 = 'world';",
      "// END WORKFLOW AREA",
    ];

    const originalTargetLines = [...targetLines];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should remain unchanged since all lines already exist
    expect(result).toEqual(originalTargetLines);
  });

  it("should sort lines alphabetically in SORTED WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const zebra = 'z';",
      "  const apple = 'a';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const monkey = 'm';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // All lines should be sorted alphabetically
    expect(result).toEqual([
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const apple = 'a';",
      "  const monkey = 'm';",
      "  const zebra = 'z';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should sort lines and prevent duplicates in SORTED WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const zebra = 'z';",
      "  const apple = 'a';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const apple = 'a';",
      "  const monkey = 'm';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should not duplicate apple, should add zebra, and all should be sorted
    expect(result).toEqual([
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const apple = 'a';",
      "  const monkey = 'm';",
      "  const zebra = 'z';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle SORTED WORKFLOW AREA with different comment styles", () => {
    const sourceLines = [
      "# BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  zebra",
      "  apple",
      "# END WORKFLOW AREA",
    ];

    const targetLines = [
      "# BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  monkey",
      "# END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.py",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    expect(result).toEqual([
      "# BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  apple",
      "  monkey",
      "  zebra",
      "# END WORKFLOW AREA",
    ]);
  });

  it("should remove empty strings from SORTED WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const zebra = 'z';",
      "",
      "  const apple = 'a';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const monkey = 'm';",
      "",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Empty strings should be removed
    expect(result).toEqual([
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const apple = 'a';",
      "  const monkey = 'm';",
      "  const zebra = 'z';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should remove whitespace-only lines from SORTED WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const zebra = 'z';",
      "  ",
      "  const apple = 'a';",
      "\t",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const monkey = 'm';",
      "   ",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Whitespace-only lines should be removed
    expect(result).toEqual([
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  const apple = 'a';",
      "  const monkey = 'm';",
      "  const zebra = 'z';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not remove empty or whitespace lines from non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code = 'test';",
      "",
      "  const more = 'code';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Empty lines should be preserved in non-sorted areas
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code = 'test';",
      "",
      "  const more = 'code';",
      "// END WORKFLOW AREA",
    ]);
  });
});
