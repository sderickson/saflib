import { describe, it, expect } from "vitest";
import {
  parseWorkflowAreaStart,
  isWorkflowAreaEnd,
  isWorkflowAreaElse,
  splitIfElseBlocks,
  resolveConditionalBlocks,
} from "./parse.ts";

describe("parseWorkflowAreaStart", () => {
  it("returns null for non-matching lines", () => {
    expect(parseWorkflowAreaStart("  const x = 1;")).toBeNull();
    expect(parseWorkflowAreaStart("")).toBeNull();
    expect(parseWorkflowAreaStart("// BEGIN WORKFLOW ZONE foo FOR w1")).toBeNull();
  });

  it("parses basic BEGIN WORKFLOW AREA", () => {
    const line = "// BEGIN WORKFLOW AREA myArea FOR workflow1";
    const parsed = parseWorkflowAreaStart(line);
    expect(parsed).toEqual({
      areaName: "myArea",
      workflowIds: ["workflow1"],
      isSorted: false,
      isOnce: false,
      ifFlag: undefined,
      fullLine: line,
    });
  });

  it("parses SORTED WORKFLOW AREA", () => {
    const line = "// BEGIN SORTED WORKFLOW AREA area2 FOR workflow1 workflow2";
    const parsed = parseWorkflowAreaStart(line);
    expect(parsed).toEqual({
      areaName: "area2",
      workflowIds: ["workflow1", "workflow2"],
      isSorted: true,
      isOnce: false,
      ifFlag: undefined,
      fullLine: line,
    });
  });

  it("parses ONCE WORKFLOW AREA", () => {
    const line = "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route";
    const parsed = parseWorkflowAreaStart(line);
    expect(parsed).toEqual({
      areaName: "requestBody",
      workflowIds: ["openapi/add-route"],
      isSorted: false,
      isOnce: true,
      ifFlag: undefined,
      fullLine: line,
    });
  });

  it("parses IF flag at end", () => {
    const line =
      "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload";
    const parsed = parseWorkflowAreaStart(line);
    expect(parsed).toEqual({
      areaName: "requestBody",
      workflowIds: ["openapi/add-route"],
      isSorted: false,
      isOnce: true,
      ifFlag: "upload",
      fullLine: line,
    });
  });

  it("parses area with multiple workflow IDs and IF", () => {
    const line = "// BEGIN WORKFLOW AREA foo FOR w1 w2 w3 IF myflag";
    const parsed = parseWorkflowAreaStart(line);
    expect(parsed?.workflowIds).toEqual(["w1", "w2", "w3"]);
    expect(parsed?.ifFlag).toBe("myflag");
  });
});

describe("isWorkflowAreaEnd", () => {
  it("returns true for END WORKFLOW AREA lines", () => {
    expect(isWorkflowAreaEnd("// END WORKFLOW AREA")).toBe(true);
    expect(isWorkflowAreaEnd("# END WORKFLOW AREA")).toBe(true);
    expect(isWorkflowAreaEnd("  # END WORKFLOW AREA  ")).toBe(true);
  });

  it("returns false for non-END lines", () => {
    expect(isWorkflowAreaEnd("// END")).toBe(false);
    expect(isWorkflowAreaEnd("  code")).toBe(false);
    expect(isWorkflowAreaEnd("END")).toBe(false);
  });
});

describe("isWorkflowAreaElse", () => {
  it("returns true for ELSE marker lines", () => {
    expect(isWorkflowAreaElse("# ELSE")).toBe(true);
    expect(isWorkflowAreaElse("// ELSE")).toBe(true);
    expect(isWorkflowAreaElse("      # ELSE")).toBe(true);
    expect(isWorkflowAreaElse("# ELSE  ")).toBe(true);
  });

  it("returns false for non-ELSE lines", () => {
    expect(isWorkflowAreaElse("  content")).toBe(false);
    expect(isWorkflowAreaElse("# ELSEBRANCH")).toBe(false);
  });
});

describe("splitIfElseBlocks", () => {
  it("returns all lines in ifBlock when no ELSE", () => {
    const lines = ["  line1", "  line2"];
    expect(splitIfElseBlocks(lines)).toEqual({
      ifBlock: ["  line1", "  line2"],
      elseBlock: [],
    });
  });

  it("splits at ELSE marker", () => {
    const lines = ["  ifContent", "# ELSE", "  elseContent"];
    expect(splitIfElseBlocks(lines)).toEqual({
      ifBlock: ["  ifContent"],
      elseBlock: ["  elseContent"],
    });
  });

  it("handles multiple lines in each block", () => {
    const lines = ["a", "b", "# ELSE", "c", "d"];
    expect(splitIfElseBlocks(lines)).toEqual({
      ifBlock: ["a", "b"],
      elseBlock: ["c", "d"],
    });
  });

  it("handles empty if-block", () => {
    const lines = ["# ELSE", "  elseOnly"];
    expect(splitIfElseBlocks(lines)).toEqual({
      ifBlock: [],
      elseBlock: ["  elseOnly"],
    });
  });

  it("handles empty else-block", () => {
    const lines = ["  ifOnly", "# ELSE"];
    expect(splitIfElseBlocks(lines)).toEqual({
      ifBlock: ["  ifOnly"],
      elseBlock: [],
    });
  });
});

describe("resolveConditionalBlocks", () => {
  it("returns all lines when no ifFlag (no conditional)", () => {
    const lines = ["  a", "  b"];
    expect(resolveConditionalBlocks(lines, undefined, {})).toEqual([
      "  a",
      "  b",
    ]);
  });

  it("returns ifBlock when flag is true", () => {
    const lines = ["  ifLine", "# ELSE", "  elseLine"];
    expect(
      resolveConditionalBlocks(lines, "upload", { upload: true }),
    ).toEqual(["  ifLine"]);
  });

  it("returns elseBlock when flag is false", () => {
    const lines = ["  ifLine", "# ELSE", "  elseLine"];
    expect(
      resolveConditionalBlocks(lines, "upload", { upload: false }),
    ).toEqual(["  elseLine"]);
  });

  it("returns elseBlock when flag is missing (default false)", () => {
    const lines = ["  ifLine", "# ELSE", "  elseLine"];
    expect(resolveConditionalBlocks(lines, "upload", undefined)).toEqual([
      "  elseLine",
    ]);
    expect(resolveConditionalBlocks(lines, "upload", {})).toEqual([
      "  elseLine",
    ]);
  });

  it("with no ELSE and flag true returns all lines", () => {
    const lines = ["  only"];
    expect(resolveConditionalBlocks(lines, "x", { x: true })).toEqual([
      "  only",
    ]);
  });

  it("with no ELSE and flag false returns empty array", () => {
    const lines = ["  only"];
    expect(resolveConditionalBlocks(lines, "x", { x: false })).toEqual([]);
  });
});
