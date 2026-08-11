import { describe, expect, it } from "vitest";
import path from "node:path";
import { findMonorepoRoot } from "../resolve/index.ts";
import { analyzeSpaRouter, listGateSpas } from "./analyze-router.ts";
import { parseAsyncVuePageTarget } from "./parse-async-vue.ts";
import { spaClientDir } from "./paths.ts";

/**
 * Nearest workspace root from this file. When saflib is nested under a product
 * monorepo (pathclerk) that configures SPA gates, prefer that outer root so
 * analyze-router exercises real routers; standalone saflib CI just skips.
 */
function resolveSpaTestRoot(): string | undefined {
  let nearest: string;
  try {
    nearest = findMonorepoRoot(import.meta.dirname);
  } catch {
    return undefined;
  }

  try {
    const outer = findMonorepoRoot(path.dirname(nearest));
    if (outer !== nearest && listGateSpas(outer).length > 0) {
      return outer;
    }
  } catch {
    // Standalone saflib (or no outer workspaces package.json).
  }

  return nearest;
}

describe("spa analyze-router", () => {
  const root = resolveSpaTestRoot();
  const spas = root ? listGateSpas(root) : [];

  it.skipIf(!root || spas.length === 0)(
    "parses configured SPA router routes with page vue targets",
    () => {
      const spa = spas[0]!;
      const catalog = analyzeSpaRouter(root!, spa);
      expect(catalog).toBeDefined();
      expect(catalog!.routes.length).toBeGreaterThan(0);
    },
  );

  it.skipIf(!root || !spas.includes("auth"))(
    "parses auth registration route",
    () => {
      const catalog = analyzeSpaRouter(root!, "auth");
      expect(catalog).toBeDefined();
      expect(
        catalog!.routes.some((r) => r.componentName === "RegistrationAsync"),
      ).toBe(true);
    },
  );

  it.skipIf(!root || spas.length === 0)("extracts lazy page from Async.vue", () => {
    const spa =
      spas.find((s) => analyzeSpaRouter(root!, s)?.routes.length) ?? spas[0]!;
    const catalog = analyzeSpaRouter(root!, spa);
    const route = catalog?.routes.find((r) =>
      r.asyncVueFile.endsWith("Async.vue"),
    );
    expect(route).toBeDefined();
    const asyncPath = path.join(root!, route!.asyncVueFile);
    const target = parseAsyncVuePageTarget(asyncPath);
    expect(target?.endsWith(".vue")).toBe(true);
    expect(target).not.toBe(asyncPath);
  });

  it("returns undefined when clientsRoot is not configured", () => {
    const rel = spaClientDir("/tmp/no-saf-imports-root", "app");
    expect(rel).toBeUndefined();
  });
});
