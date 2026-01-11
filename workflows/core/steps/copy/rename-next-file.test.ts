import { describe, it, expect } from "vitest";
import { processFileContent } from "./rename-next-file.ts";

describe("processFileContent", () => {
  it("should replace template-file variants with name", () => {
    const contentLines = [
      "export class TemplateFile {",
      "  name = 'template-file';",
      "  snake_name = 'template_file';",
      "  const TEMPLATE_FILE = 'test';",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "export class FooBar {",
      "  name = 'foo-bar';",
      "  snake_name = 'foo_bar';",
      "  const FOO_BAR = 'test';",
    ]);
  });

  it("should apply lineReplace function", () => {
    const contentLines = ["const x = 'template-name';"];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      lineReplace: (line) => line.replace("template-name", "actual-name"),
      workflowId: "workflow1",
    });

    expect(result).toEqual(["const x = 'actual-name';"]);
  });

  it("should remove DELETE_THIS_LINE", () => {
    const contentLines = ["const x = 1;", "DELETE_THIS_LINE", "const y = 2;"];

    const result = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result).toEqual(["const x = 1;", "", "const y = 2;"]);
  });

  it("should keep the /* do not replace */ marker", () => {
    const contentLines = [
      "const x = 1;",
      "const y = 2; /* do not replace */",
      "const z = 3;",
    ];

    const result = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "const x = 1;",
      "const y = 2; /* do not replace */",
      "const z = 3;",
    ]);
  });

  it("should keep workflow area BEGIN and END lines when workflow applies", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should empty content lines in workflow area when workflow does not apply", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow2",
      "  const code = 'hello';",
      "  const more = 'world';",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      workflowId: "workflow1", // Not in the list
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow2",
      "",
      "",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should process content normally in workflow area when workflow applies", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const template-file = 'test';",
      "  const TemplateFile = 'test2';",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  const foo-bar = 'test';",
      "  const FooBar = 'test2';",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle multiple workflow areas", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow2",
      "  code2",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "middle code",
      "// BEGIN WORKFLOW AREA area2 FOR workflow2",
      "",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle SORTED WORKFLOW AREA", () => {
    const contentLines = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle workflow areas with multiple workflow IDs", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2 workflow3",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ];

    // Should work for workflow1
    const result1 = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result1).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2 workflow3",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ]);

    // Should work for workflow2
    const result2 = processFileContent({
      contentLines,
      workflowId: "workflow2",
    });

    expect(result2).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2 workflow3",
      "  const code = 'hello';",
      "// END WORKFLOW AREA",
    ]);

    // Should NOT work for workflow4
    const result3 = processFileContent({
      contentLines,
      workflowId: "workflow4",
    });

    expect(result3).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2 workflow3",
      "",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should handle different comment styles", () => {
    const contentLines = [
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  python code",
      "# END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  python code",
      "# END WORKFLOW AREA",
    ]);
  });

  it("should combine lineReplace with workflow area processing", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  template-name code",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      lineReplace: (line) => line.replace("template-name", "actual-name"),
      workflowId: "workflow1",
    });

    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  actual-name code",
      "// END WORKFLOW AREA",
    ]);
  });

  it("should not apply lineReplace to content in non-applicable workflow areas", () => {
    const contentLines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow2",
      "  template-name code",
      "// END WORKFLOW AREA",
    ];

    const result = processFileContent({
      contentLines,
      name: "foo-bar",
      lineReplace: (line) => line.replace("template-name", "actual-name"),
      workflowId: "workflow1", // Not in the list
    });

    // Content should be empty, not transformed
    expect(result).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow2",
      "",
      "// END WORKFLOW AREA",
    ]);
  });
});
