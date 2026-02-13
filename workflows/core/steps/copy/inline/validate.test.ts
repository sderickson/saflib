import { describe, it, expect } from "vitest";
import {
  extractWorkflowAreas,
  getAreaKey,
  validateWorkflowAreas,
} from "./validate.ts";

describe("extractWorkflowAreas", () => {
  it("returns empty array for no areas", () => {
    expect(extractWorkflowAreas(["line1", "line2"])).toEqual([]);
  });

  it("extracts one closed area", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const areas = extractWorkflowAreas(lines);
    expect(areas).toHaveLength(1);
    expect(areas[0]).toMatchObject({
      areaName: "myArea",
      workflowIds: ["workflow1"],
      isSorted: false,
      isOnce: false,
      ifFlag: undefined,
      endLine: "// END WORKFLOW AREA",
    });
  });

  it("extracts area with ONCE and IF", () => {
    const lines = [
      "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
      "  content",
      "# END WORKFLOW AREA",
    ];
    const areas = extractWorkflowAreas(lines);
    expect(areas).toHaveLength(1);
    expect(areas[0]).toMatchObject({
      areaName: "requestBody",
      workflowIds: ["openapi/add-route"],
      isSorted: false,
      isOnce: true,
      ifFlag: "upload",
      endLine: "# END WORKFLOW AREA",
    });
  });

  it("extracts multiple areas", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "// BEGIN SORTED WORKFLOW AREA area2 FOR workflow1 workflow2",
      "  code2",
      "// END WORKFLOW AREA",
    ];
    const areas = extractWorkflowAreas(lines);
    expect(areas).toHaveLength(2);
    expect(areas[0].areaName).toBe("area1");
    expect(areas[0].isSorted).toBe(false);
    expect(areas[1].areaName).toBe("area2");
    expect(areas[1].isSorted).toBe(true);
    expect(areas[1].workflowIds).toEqual(["workflow1", "workflow2"]);
  });

  it("records endLine null when area has no END", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
    ];
    const areas = extractWorkflowAreas(lines);
    expect(areas).toHaveLength(1);
    expect(areas[0].endLine).toBeNull();
  });

  it("when nested BEGIN without END, first area has endLine null", () => {
    const lines = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code1",
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  code2",
      "// END WORKFLOW AREA",
    ];
    const areas = extractWorkflowAreas(lines);
    expect(areas).toHaveLength(2);
    expect(areas[0].endLine).toBeNull();
    expect(areas[1].endLine).toBe("// END WORKFLOW AREA");
  });
});

describe("getAreaKey", () => {
  it("normalizes workflow ID order", () => {
    const area1 = {
      areaName: "myArea",
      workflowIds: ["workflow1", "workflow2"],
      isSorted: false,
      isOnce: false,
      ifFlag: undefined as string | undefined,
      startLine: "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2",
      endLine: "// END WORKFLOW AREA" as string | null,
    };
    const area2 = {
      ...area1,
      startLine: "// BEGIN WORKFLOW AREA myArea FOR workflow2 workflow1",
    };
    expect(getAreaKey(area1)).toBe(getAreaKey(area2));
  });

  it("includes ONCE and IF in key", () => {
    const normal = {
      areaName: "x",
      workflowIds: ["w1"],
      isSorted: false,
      isOnce: false,
      ifFlag: undefined as string | undefined,
      startLine: "// BEGIN WORKFLOW AREA x FOR w1",
      endLine: "// END" as string | null,
    };
    const withOnce = { ...normal, isOnce: true, startLine: "// BEGIN ONCE WORKFLOW AREA x FOR w1" };
    const withIf = { ...normal, ifFlag: "upload", startLine: "// BEGIN WORKFLOW AREA x FOR w1 IF upload" };
    expect(getAreaKey(normal)).not.toBe(getAreaKey(withOnce));
    expect(getAreaKey(normal)).not.toBe(getAreaKey(withIf));
  });

  it("preserves comment prefix in key", () => {
    const slash = {
      areaName: "myArea",
      workflowIds: ["workflow1"],
      isSorted: false,
      isOnce: false,
      ifFlag: undefined as string | undefined,
      startLine: "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      endLine: null as string | null,
    };
    const hash = {
      ...slash,
      startLine: "# BEGIN WORKFLOW AREA myArea FOR workflow1",
    };
    expect(getAreaKey(slash)).not.toBe(getAreaKey(hash));
  });
});

describe("validateWorkflowAreas", () => {
  const ctx = { targetPath: "test.ts", sourcePath: "test.ts" };

  it("does not throw when source and target have matching areas", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).not.toThrow();
  });

  it("does not throw when areas match with multiple workflow IDs (order normalized)", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1 workflow2 workflow3",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow3 workflow1 workflow2",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).not.toThrow();
  });

  it("does not throw when matching ONCE IF areas", () => {
    const source = [
      "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
      "  content",
      "# END WORKFLOW AREA",
    ];
    const target = [
      "# BEGIN ONCE WORKFLOW AREA requestBody FOR openapi/add-route IF upload",
      "  resolved",
      "# END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).not.toThrow();
  });

  it("does not throw when source has ONCE area that target does not have (ONCE areas are removed after resolution)", () => {
    const source = [
      "// BEGIN ONCE WORKFLOW AREA onceArea FOR workflow1",
      "  content",
      "// END WORKFLOW AREA",
    ];
    const target: string[] = [];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).not.toThrow();
  });

  it("throws when source has non-ONCE area that target does not have", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({
        sourceLines: source,
        targetLines: [],
        ...ctx,
      }),
    ).toThrow();
  });

  it("throws when target has area that source does not have", () => {
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({
        sourceLines: [],
        targetLines: target,
        ...ctx,
      }),
    ).toThrow();
  });

  it("throws when source area is missing END marker", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow(/without matching END marker/);
  });

  it("throws when target area is missing END marker", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow(/without matching END marker/);
  });

  it("throws when areas differ in sorted status (different keys)", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN SORTED WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow();
  });

  it("throws when areas differ in workflow IDs (different keys)", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow2",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow();
  });

  it("throws when areas have different names (different keys)", () => {
    const source = [
      "// BEGIN WORKFLOW AREA area1 FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA area2 FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow();
  });

  it("throws when source has duplicate areas", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code2",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow(/duplicate/);
  });

  it("throws when target has duplicate areas", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing1",
      "// END WORKFLOW AREA",
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing2",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow(/duplicate/);
  });

  it("throws when comment styles differ (different prefix)", () => {
    const source = [
      "// BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "# BEGIN WORKFLOW AREA myArea FOR workflow1",
      "  existing",
      "# END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow();
  });

  it("throws when target has area that source does not have (e.g. target has non-ONCE, source has ONCE)", () => {
    const source = [
      "// BEGIN ONCE WORKFLOW AREA x FOR w1",
      "  code",
      "// END WORKFLOW AREA",
    ];
    const target = [
      "// BEGIN WORKFLOW AREA x FOR w1",
      "  existing",
      "// END WORKFLOW AREA",
    ];
    expect(() =>
      validateWorkflowAreas({ sourceLines: source, targetLines: target, ...ctx }),
    ).toThrow(/Target has workflow area/);
  });
});
