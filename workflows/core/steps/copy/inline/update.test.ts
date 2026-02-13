import { describe, it, expect } from "vitest";
import { updateWorkflowAreas } from "./update.ts";

describe("updateWorkflowAreas", () => {
  it("appends content when workflow ID matches", () => {
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

  it("does not modify when workflow ID does not match", () => {
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

  it("transforms lines using lineReplace", () => {
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

  it("IF/ELSE: merges if-block when flag is true and target area is empty", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
        "// END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
        "  multipartContent",
        "// ELSE",
        "  applicationJson",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line,
      flags: { upload: true },
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
      "  multipartContent",
      "// END WORKFLOW AREA",
    ]);
  });

  it("IF/ELSE: uses else-block when flag is false", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
        "// END WORKFLOW AREA",
      ],
      targetPath: "test.ts",
      sourceLines: [
        "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
        "  multipart",
        "// ELSE",
        "  applicationJson",
        "// END WORKFLOW AREA",
      ],
      workflowId: "workflow1",
      lineReplace: (line) => line,
      flags: { upload: false },
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA body FOR workflow1 IF upload",
      "  applicationJson",
      "// END WORKFLOW AREA",
    ]);
  });

  it("ONCE: replaces entire area with resolved content only (no markers)", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
        "  multipart/content",
        "# ELSE",
        "  application/json",
        "# END WORKFLOW AREA",
      ],
      targetPath: "test.yaml",
      sourceLines: [
        "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
        "  multipart/form-data:",
        "    schema: {}",
        "# ELSE",
        "  application/json:",
        "    schema: {}",
        "# END WORKFLOW AREA",
      ],
      workflowId: "openapi/add-route",
      lineReplace: (line) => line,
      flags: { upload: true },
    });

    expect(result).toEqual([
      "  multipart/form-data:",
      "    schema: {}",
    ]);
  });

  it("ONCE with IF false: replaces with else-block only", () => {
    const result = updateWorkflowAreas({
      targetLines: [
        "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
        "# ELSE",
        "# END WORKFLOW AREA",
      ],
      targetPath: "test.yaml",
      sourceLines: [
        "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
        "  multipart",
        "# ELSE",
        "  application/json",
        "# END WORKFLOW AREA",
      ],
      workflowId: "openapi/add-route",
      lineReplace: (line) => line,
      flags: { upload: false },
    });

    expect(result).toEqual(["  application/json"]);
  });

  it("non-sorted: does not add when entire sequence exists consecutively", () => {
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

  it("non-sorted: adds all lines when sequence does not exist consecutively", () => {
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

  it("sorted: sorts and deduplicates lines", () => {
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

  it("handles multiple areas in one file", () => {
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

  it("handles multiple areas and different comment styles", () => {
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

  it("preserves empty/whitespace lines in non-sorted area", () => {
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
