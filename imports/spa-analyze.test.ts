import { describe, expect, it } from "vitest";
import path from "node:path";
import { findMonorepoRoot } from "./src/resolve/index.ts";
import { analyzeSpaRouter, listGateSpas } from "./src/spa/analyze-router.ts";
import { parseAsyncVuePageTarget } from "./src/spa/parse-async-vue.ts";
import { spaClientDir } from "./src/spa/paths.ts";

describe("spa analyze-router", () => {
  const root = findMonorepoRoot(path.join(import.meta.dirname, "..", ".."));
  const spas = listGateSpas(root);

  it.skipIf(spas.length === 0)(
    "parses configured SPA router routes with page vue targets",
    () => {
      const spa = spas[0]!;
      const catalog = analyzeSpaRouter(root, spa);
      expect(catalog).toBeDefined();
      expect(catalog!.routes.length).toBeGreaterThan(0);
    },
  );

  it.skipIf(!spas.includes("auth"))("parses auth registration route", () => {
    const catalog = analyzeSpaRouter(root, "auth");
    expect(catalog).toBeDefined();
    expect(
      catalog!.routes.some((r) => r.componentName === "RegistrationAsync"),
    ).toBe(true);
  });

  it.skipIf(spas.length === 0)("extracts lazy page from Async.vue", () => {
    const spa = spas.find((s) => analyzeSpaRouter(root, s)?.routes.length) ?? spas[0]!;
    const catalog = analyzeSpaRouter(root, spa);
    const route = catalog?.routes.find((r) => r.asyncVueFile.endsWith("Async.vue"));
    expect(route).toBeDefined();
    const asyncPath = path.join(root, route!.asyncVueFile);
    const target = parseAsyncVuePageTarget(asyncPath);
    expect(target?.endsWith(".vue")).toBe(true);
    expect(target).not.toBe(asyncPath);
  });

  it("returns undefined when clientsRoot is not configured", () => {
    const rel = spaClientDir("/tmp/no-saf-imports-root", "app");
    expect(rel).toBeUndefined();
  });
});
