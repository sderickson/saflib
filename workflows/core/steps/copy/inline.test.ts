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

  it("should add all lines if entire sequence doesn't exist consecutively", () => {
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

    // Should add all lines since entire sequence doesn't exist consecutively
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code1 = 'hello';",
      "  const code1 = 'hello';",
      "  const code2 = 'world';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not add any lines if entire sequence exists consecutively", () => {
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

    // Should remain unchanged since entire sequence exists consecutively
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

  it("should append multiple new lines to non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "  const line5 = 'five';",
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

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "  const line5 = 'five';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should add all lines when sequence is interrupted in target", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "  const line5 = 'five';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should add all lines since entire sequence doesn't exist consecutively
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line3 = 'three';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "  const line5 = 'five';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should append multiple lines with transformations in non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  template-line1",
      "  template-line2",
      "  template-line3",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "// END WORKFLOW AREA",
    ];

    const lineReplace = (line: string) => line.replace("template", "actual");

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace,
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "  actual-line1",
      "  actual-line2",
      "  actual-line3",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle multiple non-sorted areas with multiple lines each", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  area1-line1",
      "  area1-line2",
      "  area1-line3",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  area2-line1",
      "  area2-line2",
      "  area2-line3",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  area1-existing",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
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
      "  area1-existing",
      "  area1-line1",
      "  area1-line2",
      "  area1-line3",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  area2-line1",
      "  area2-line2",
      "  area2-line3",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should append lines in correct order when target has existing content in non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  new-line-1",
      "  new-line-2",
      "  new-line-3",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line-1",
      "  existing-line-2",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // New lines should be appended after existing lines, before END marker
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line-1",
      "  existing-line-2",
      "  new-line-1",
      "  new-line-2",
      "  new-line-3",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle empty lines in source when appending to non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "",
      "  const line2 = 'two';",
      "  ",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Empty and whitespace lines should be preserved in non-sorted areas
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "  const line1 = 'one';",
      "",
      "  const line2 = 'two';",
      "  ",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle many lines (10+) being appended to non-sorted WORKFLOW AREA", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      ...Array.from(
        { length: 15 },
        (_, i) => `  const line${i + 1} = 'value${i + 1}';`,
      ),
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

    // Should have all 15 lines
    expect(result.length).toBe(17); // BEGIN + 15 lines + END
    expect(result[0]).toBe("// BEGIN WORKFLOW AREA myArea FOR workflow1");
    expect(result[16]).toBe("// END WORKFLOW AREA");
    expect(result.slice(1, 16)).toEqual(
      Array.from(
        { length: 15 },
        (_, i) => `  const line${i + 1} = 'value${i + 1}';`,
      ),
    );
  });

  it("should preserve duplicate lines in source when sequence doesn't exist", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const duplicate = 'same';",
      "  const unique1 = 'one';",
      "  const duplicate = 'same';",
      "  const unique2 = 'two';",
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

    // Duplicate lines should be preserved as they're part of the sequence
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const duplicate = 'same';",
      "  const unique1 = 'one';",
      "  const duplicate = 'same';",
      "  const unique2 = 'two';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not add lines if entire sequence already exists consecutively", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
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

    // Should remain unchanged since entire sequence exists
    expect(result).toEqual(originalTargetLines);
  });

  it("should add all lines if sequence is interrupted in target", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const otherLine = 'other';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should add all lines since sequence is interrupted
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const otherLine = 'other';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should add all lines if sequence exists but in wrong order", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line3 = 'three';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should add all lines since they're not in the correct order
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line3 = 'three';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should add all lines if only partial sequence exists", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should add all lines since entire sequence doesn't exist
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line1 = 'one';",
      "  const line2 = 'two';",
      "  const line3 = 'three';",
      "  const line4 = 'four';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle same area processed multiple times in source", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  first-batch-line1",
      "  first-batch-line2",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  second-batch-line1",
      "  second-batch-line2",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Both batches should be appended
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing-line",
      "  first-batch-line1",
      "  first-batch-line2",
      "  second-batch-line1",
      "  second-batch-line2",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should correctly handle indices when multiple areas modify the file", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  area1-new1",
      "  area1-new2",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  area2-new1",
      "  area2-new2",
      "  area2-new3",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area3 FOR workflow1",
      "  area3-new1",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  area1-existing",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area3 FOR workflow1",
      "  area3-existing",
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // All areas should be updated correctly despite indices changing
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  area1-existing",
      "  area1-new1",
      "  area1-new2",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  area2-new1",
      "  area2-new2",
      "  area2-new3",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA area3 FOR workflow1",
      "  area3-existing",
      "  area3-new1",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should preserve all lines when target area has many existing lines", () => {
    const sourceLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  new-line-1",
      "  new-line-2",
      "  new-line-3",
      "// END WORKFLOW AREA",
    ];

    const targetLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      ...Array.from({ length: 10 }, (_, i) => `  existing-line-${i + 1}`),
      "// END WORKFLOW AREA",
    ];

    const result = updateWorkflowAreas({
      targetLines,
      targetPath: "test.ts",
      sourceLines,
      workflowId: "workflow1",
      lineReplace: (line) => line,
    });

    // Should have all 10 existing lines + 3 new lines
    expect(result.length).toBe(15); // BEGIN + 10 existing + 3 new + END
    expect(result[0]).toBe("// BEGIN WORKFLOW AREA myArea FOR workflow1");
    expect(result[14]).toBe("// END WORKFLOW AREA");
    expect(result.slice(1, 11)).toEqual(
      Array.from({ length: 10 }, (_, i) => `  existing-line-${i + 1}`),
    );
    expect(result.slice(11, 14)).toEqual([
      "  new-line-1",
      "  new-line-2",
      "  new-line-3",
    ]);
  });
});
