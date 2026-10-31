import { describe, expect, it } from "vitest";
import type { RouteLocationNormalized } from "vue-router";
import { scrollBehavior } from "./scroll-behavior.ts";

const route = (path: string, hash = "") =>
  ({ path, hash }) as RouteLocationNormalized;

describe("scrollBehavior", () => {
  it("restores the saved position on back/forward", async () => {
    // jsdom has no layout; fake a tall page so the position is reachable.
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 10000,
    });
    const saved = { left: 0, top: 500 };
    expect(await scrollBehavior(route("/a"), route("/b"), saved)).toEqual(
      saved,
    );
  });

  it("scrolls to the hash element", async () => {
    expect(await scrollBehavior(route("/a", "#x"), route("/b"), null)).toEqual({
      el: "#x",
    });
  });

  it("leaves scroll alone for same-path navigation", async () => {
    expect(await scrollBehavior(route("/a"), route("/a"), null)).toBe(false);
  });

  it("scrolls to top for new pages", async () => {
    expect(await scrollBehavior(route("/a"), route("/b"), null)).toEqual({
      top: 0,
    });
  });
});
