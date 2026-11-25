import { describe, it, expect } from "vitest";
import { commitHref } from "./build-info.ts";

describe("commitHref", () => {
  it("links a real sha", () => {
    expect(commitHref("https://github.com/acme/app/", "b4652e6a45ad")).toBe(
      "https://github.com/acme/app/commit/b4652e6a45ad",
    );
  });
  it("skips unknown hashes and missing repos", () => {
    expect(commitHref("https://github.com/acme/app", "unknown")).toBeUndefined();
    expect(commitHref(undefined, "b4652e6a45ad")).toBeUndefined();
  });
});
