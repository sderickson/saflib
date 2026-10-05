import { describe, it, expect } from "vitest";
import { resolveTemplateWorkflowAreas } from "./resolve-template.ts";

describe("resolveTemplateWorkflowAreas", () => {
  it("passes through lines when no workflow areas", () => {
    const lines = ["line1", "line2", "line3"];
    expect(resolveTemplateWorkflowAreas(lines, "workflow1")).toEqual(lines);
  });

  it("passes through simple area when workflow applies and not conditional", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  content",
      "// END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "workflow1")).toEqual(lines);
  });

  it("empties content when area does not apply to workflow", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  content",
      "// END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "workflow2")).toEqual([
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "",
      "// END WORKFLOW AREA",
    ]);
  });

  it("IF/ELSE: outputs only if-block when flag is true", () => {
    const lines = [
      "# BEGIN ONCE WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "# ELSE",
      "  application/json",
      "# END WORKFLOW AREA",
    ];
    expect(
      resolveTemplateWorkflowAreas(lines, "w1", { upload: true }),
    ).toEqual(["  multipart"]);
  });

  it("IF/ELSE: outputs only else-block when flag is false", () => {
    const lines = [
      "# BEGIN ONCE WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "# ELSE",
      "  application/json",
      "# END WORKFLOW AREA",
    ];
    expect(
      resolveTemplateWorkflowAreas(lines, "w1", { upload: false }),
    ).toEqual(["  application/json"]);
  });

  it("IF/ELSE: defaults to else-block when flag missing", () => {
    const lines = [
      "# BEGIN ONCE WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "# ELSE",
      "  application/json",
      "# END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "w1")).toEqual([
      "  application/json",
    ]);
  });

  it("ONCE without IF: outputs all area content (no markers)", () => {
    const lines = [
      "# BEGIN ONCE WORKFLOW AREA body FOR w1",
      "  content",
      "# END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "w1")).toEqual(["  content"]);
  });

  it("non-ONCE IF/ELSE: keeps BEGIN/END and outputs only chosen branch", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "// ELSE",
      "  application/json",
      "// END WORKFLOW AREA",
    ];
    expect(
      resolveTemplateWorkflowAreas(lines, "w1", { upload: true }),
    ).toEqual([
      "// BEGIN WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "// END WORKFLOW AREA",
    ]);
  });

  it("handles multiple areas", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA a1 FOR w1",
      "  one",
      "// END WORKFLOW AREA",
      "// BEGIN ONCE WORKFLOW AREA a2 FOR w1 IF flag",
      "  two",
      "// ELSE",
      "  other",
      "// END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "w1", { flag: true })).toEqual([
      "// BEGIN WORKFLOW AREA a1 FOR w1",
      "  one",
      "// END WORKFLOW AREA",
      "  two",
    ]);
  });

  it("handles area with multiple workflow IDs when one matches", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA myArea FOR w1 w2",
      "  content",
      "// END WORKFLOW AREA",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "w2")).toEqual(lines);
  });

  it("preserves lines outside and between areas", () => {
    const lines = [
      "before",
      "// BEGIN WORKFLOW AREA a FOR w1",
      "  in",
      "// END WORKFLOW AREA",
      "middle",
      "// BEGIN WORKFLOW AREA b FOR w1",
      "  in2",
      "// END WORKFLOW AREA",
      "after",
    ];
    expect(resolveTemplateWorkflowAreas(lines, "w1")).toEqual(lines);
  });

  it("conditional area that does not apply: empties content and keeps BEGIN/END", () => {
    const lines = [
      "// BEGIN ONCE WORKFLOW AREA body FOR w1 IF upload",
      "  multipart",
      "// ELSE",
      "  json",
      "// END WORKFLOW AREA",
    ];
    const result = resolveTemplateWorkflowAreas(lines, "w2");
    expect(result[0]).toBe("// BEGIN ONCE WORKFLOW AREA body FOR w1 IF upload");
    expect(result[result.length - 1]).toBe("// END WORKFLOW AREA");
    expect(result.slice(1, -1).every((l) => l === "")).toBe(true);
    expect(result.length).toBe(5);
  });
});
