import { describe, expect, it } from "vitest";
import path from "node:path";
import { findMonorepoRoot } from "./src/resolve/index.ts";
import { analyzeSpaRouter } from "./src/spa/analyze-router.ts";
import { parseAsyncVuePageTarget } from "./src/spa/parse-async-vue.ts";

describe("spa analyze-router", () => {
  const root = findMonorepoRoot(path.join(import.meta.dirname, "..", ".."));

  it("parses app router routes with page vue targets", () => {
    const catalog = analyzeSpaRouter(root, "app");
    expect(catalog).toBeDefined();
    expect(catalog!.routes.length).toBeGreaterThan(10);
    const home = catalog!.routes.find((r) =>
      r.pageVueFiles.some((p) => p.endsWith("home/Home.vue")),
    );
    expect(home).toBeDefined();
  });

  it("parses auth registration route", () => {
    const catalog = analyzeSpaRouter(root, "auth");
    expect(catalog).toBeDefined();
    expect(
      catalog!.routes.some((r) => r.componentName === "RegistrationAsync"),
    ).toBe(true);
  });

  it("extracts lazy page from Async.vue", () => {
    const asyncPath = path.join(
      root,
      "daemon/clients/app/pages/home/HomeAsync.vue",
    );
    const target = parseAsyncVuePageTarget(asyncPath);
    expect(target?.endsWith("Home.vue")).toBe(true);
  });
});
