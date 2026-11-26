import { describe, it, expect } from "vitest";
import { commitHref, compareHref } from "./build-info.ts";

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

describe("compareHref", () => {
  it("links the changes between two deploys' commits", () => {
    expect(compareHref("https://github.com/a/b/", "1234567", "89abcdef-dirty")).toBe("https://github.com/a/b/compare/1234567...89abcdef");
  });

  it("skips same, unknown or missing commits", () => {
    expect(compareHref("https://github.com/a/b", "1234567", "1234567")).toBeUndefined();
    expect(compareHref("https://github.com/a/b", "unknown", "1234567")).toBeUndefined();
    expect(compareHref(undefined, "1234567", "89abcdef")).toBeUndefined();
    expect(compareHref("https://github.com/a/b", null, "89abcdef")).toBeUndefined();
  });
});
