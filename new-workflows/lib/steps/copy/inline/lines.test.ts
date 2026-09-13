import { describe, it, expect } from "vitest";
import {
  getNewLinesForNonSorted,
  getNewLinesForSorted,
} from "./lines.ts";

describe("getNewLinesForNonSorted", () => {
  const identity = (line: string) => line;

  it("returns empty array when entire sequence already exists consecutively", () => {
    const workflowLines = ["  line1", "  line2", "  line3"];
    const existing = ["  line1", "  line2", "  line3"];
    expect(
      getNewLinesForNonSorted(workflowLines, existing, identity),
    ).toEqual([]);
  });

  it("returns all transformed lines when sequence does not exist", () => {
    const workflowLines = ["  line1", "  line2"];
    const existing: string[] = [];
    expect(
      getNewLinesForNonSorted(workflowLines, existing, identity),
    ).toEqual(["  line1", "  line2"]);
  });

  it("returns all transformed lines when sequence exists but not consecutively", () => {
    const workflowLines = ["  line1", "  line2", "  line3"];
    const existing = ["  line1", "  other", "  line2"];
    expect(
      getNewLinesForNonSorted(workflowLines, existing, identity),
    ).toEqual(["  line1", "  line2", "  line3"]);
  });

  it("applies lineReplace to transformed lines", () => {
    const workflowLines = ["  template-code"];
    const existing: string[] = [];
    const lineReplace = (line: string) => line.replace("template", "actual");
    expect(
      getNewLinesForNonSorted(workflowLines, existing, lineReplace),
    ).toEqual(["  actual-code"]);
  });

  it("preserves duplicate lines in source", () => {
    const workflowLines = ["  dup", "  unique", "  dup"];
    const existing: string[] = [];
    expect(
      getNewLinesForNonSorted(workflowLines, existing, identity),
    ).toEqual(["  dup", "  unique", "  dup"]);
  });
});

describe("getNewLinesForSorted", () => {
  const identity = (line: string) => line;

  it("returns only lines not already in existing content", () => {
    const workflowLines = ["  zebra", "  apple"];
    const existing = ["  apple", "  monkey"];
    expect(getNewLinesForSorted(workflowLines, existing, identity)).toEqual([
      "  zebra",
    ]);
  });

  it("returns empty when all lines already exist", () => {
    const workflowLines = ["  apple", "  monkey"];
    const existing = ["  apple", "  monkey"];
    expect(
      getNewLinesForSorted(workflowLines, existing, identity),
    ).toEqual([]);
  });

  it("returns all when existing is empty", () => {
    const workflowLines = ["  zebra", "  apple"];
    const existing: string[] = [];
    expect(
      getNewLinesForSorted(workflowLines, existing, identity),
    ).toEqual(["  zebra", "  apple"]);
  });

  it("deduplicates: does not add line that appears in workflow twice if already in existing", () => {
    const workflowLines = ["  apple", "  apple", "  zebra"];
    const existing = ["  apple"];
    expect(
      getNewLinesForSorted(workflowLines, existing, identity),
    ).toEqual(["  zebra"]);
  });

  it("applies lineReplace before deduplication", () => {
    const workflowLines = ["  template"];
    const existing: string[] = [];
    const lineReplace = (line: string) => line.replace("template", "actual");
    expect(
      getNewLinesForSorted(workflowLines, existing, lineReplace),
    ).toEqual(["  actual"]);
  });
});
