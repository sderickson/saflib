import { describe, expect, it } from "vitest";
import {
  AddRouteWorkflowDefinition,
  mergeOpenApiRoute,
} from "./add-route.ts";
import { runWorkflow } from "@saflib/workflows";

describe("add-route", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddRouteWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});

describe("mergeOpenApiRoute", () => {
  const beginMarker =
    "BEGIN WORKFLOW AREA route-paths FOR openapi/add-route";
  const endMarker = "END WORKFLOW AREA";

  it("returns content unchanged when no workflow area markers exist", () => {
    const content = "paths:\n  /other:\n    get:\n      $ref: 'x.yaml'";
    expect(mergeOpenApiRoute(content)).toBe(content);
  });

  it("returns content unchanged when only begin marker exists", () => {
    const content = `paths:\n# ${beginMarker}\n  /x:\n    get:`;
    expect(mergeOpenApiRoute(content)).toBe(content);
  });

  it("merges duplicate path keys under a single path entry", () => {
    const content = [
      "paths:",
      `# ${beginMarker}`,
      "  /recipes:",
      "    get:",
      '      $ref: "routes/recipes/list.yaml"',
      "  /recipes:",
      "    post:",
      '      $ref: "routes/recipes/create.yaml"',
      `# ${endMarker}`,
      "  /other:",
      "    get:",
      '      $ref: "other.yaml"',
    ].join("\n");
    const result = mergeOpenApiRoute(content);
    expect(result).toContain("  /recipes:");
    expect(result).toContain("    get:");
    expect(result).toContain('      $ref: "routes/recipes/list.yaml"');
    expect(result).toContain("    post:");
    expect(result).toContain('      $ref: "routes/recipes/create.yaml"');
    // Single path key for /recipes (no duplicate "  /recipes:" line before post)
    const recipesSection = result.slice(
      result.indexOf("  /recipes:"),
      result.indexOf("  /other:")
    );
    expect(recipesSection.match(/^\s{2}\/recipes:/gm)).toHaveLength(1);
  });

  it("preserves content before and after the workflow area", () => {
    const before = "openapi: 3.0.0\npaths:";
    const after = "  /outside:\n    get:\n      $ref: 'out.yaml'";
    const content = [
      before,
      `# ${beginMarker}`,
      "  /inside:",
      "    get:",
      '      $ref: "inside.yaml"',
      `# ${endMarker}`,
      after,
    ].join("\n");
    const result = mergeOpenApiRoute(content);
    expect(result).toMatch(/^openapi: 3\.0\.0/);
    expect(result).toContain("  /outside:");
    expect(result).toContain("  /inside:");
  });

  it("handles path with path param (e.g. /recipes/{id})", () => {
    const content = [
      "paths:",
      `# ${beginMarker}`,
      "  /recipes/{id}:",
      "    get:",
      '      $ref: "routes/recipes/get.yaml"',
      "  /recipes/{id}:",
      "    put:",
      '      $ref: "routes/recipes/update.yaml"',
      `# ${endMarker}`,
    ].join("\n");
    const result = mergeOpenApiRoute(content);
    expect(result).toContain("  /recipes/{id}:");
    expect(result).toContain("    get:");
    expect(result).toContain("    put:");
    expect(result).toContain('      $ref: "routes/recipes/get.yaml"');
    expect(result).toContain('      $ref: "routes/recipes/update.yaml"');
    expect(result.match(/^\s{2}\/recipes\/\{id\}:$/gm)).toHaveLength(1);
  });
});
