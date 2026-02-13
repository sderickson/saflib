import { describe, it, expect, vi } from "vitest";
import {
  findTargetAreaIndices,
  sequenceExists,
} from "./find.ts";

describe("findTargetAreaIndices", () => {
  it("returns start and end indices when area exists", () => {
    const result = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    const indices = findTargetAreaIndices(
      result,
      result[0],
      result[2],
      "myArea",
      "test.ts",
    );
    expect(indices).toEqual({ start: 0, end: 2 });
  });

  it("finds area when BEGIN is not at start of file", () => {
    const result = [
      "header",
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  content",
      "// END WORKFLOW AREA",
      "footer",
    ];
    const indices = findTargetAreaIndices(
      result,
      result[1],
      result[3],
      "myArea",
      "test.ts",
    );
    expect(indices).toEqual({ start: 1, end: 3 });
  });

  it("returns null when BEGIN line not found", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = ["  content", "// END WORKFLOW AREA"];
    const indices = findTargetAreaIndices(
      result,
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      result[1],
      "myArea",
      "test.ts",
    );
    expect(indices).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not find target area myArea in test.ts",
    );
    consoleSpy.mockRestore();
  });

  it("returns null when END line not found after BEGIN", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  content",
      "  more",
    ];
    const indices = findTargetAreaIndices(
      result,
      result[0],
      "// END WORKFLOW AREA",
      "myArea",
      "test.ts",
    );
    expect(indices).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Target area myArea does not end in test.ts",
    );
    consoleSpy.mockRestore();
  });

  it("uses first END after BEGIN when multiple ENDs exist", () => {
    const result = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  content",
      "// END WORKFLOW AREA",
      "// END WORKFLOW AREA",
    ];
    const indices = findTargetAreaIndices(
      result,
      result[0],
      "// END WORKFLOW AREA",
      "myArea",
      "test.ts",
    );
    expect(indices).toEqual({ start: 0, end: 2 });
  });
});

describe("sequenceExists", () => {
  it("returns true for empty sequence", () => {
    expect(sequenceExists([], ["a", "b"])).toBe(true);
  });

  it("returns true when sequence exists consecutively at start", () => {
    expect(sequenceExists(["a", "b"], ["a", "b", "c"])).toBe(true);
  });

  it("returns true when sequence exists consecutively in middle", () => {
    expect(sequenceExists(["b", "c"], ["a", "b", "c", "d"])).toBe(true);
  });

  it("returns true when sequence is entire target", () => {
    expect(sequenceExists(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("returns false when sequence does not exist", () => {
    expect(sequenceExists(["x", "y"], ["a", "b", "c"])).toBe(false);
  });

  it("returns false when sequence exists but not consecutively", () => {
    expect(sequenceExists(["a", "c"], ["a", "b", "c"])).toBe(false);
  });

  it("returns false when sequence is longer than target", () => {
    expect(sequenceExists(["a", "b", "c"], ["a", "b"])).toBe(false);
  });

  it("returns false when partial match at end", () => {
    expect(sequenceExists(["b", "c"], ["a", "b"])).toBe(false);
  });
});
