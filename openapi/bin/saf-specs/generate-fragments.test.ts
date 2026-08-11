import { describe, expect, it } from "vitest";
import { canonicalSchemaFragmentNames } from "./generate-fragments.ts";

describe("canonicalSchemaFragmentNames", () => {
  it("dedupes schema keys that differ only by casing, preferring PascalCase", () => {
    expect(
      canonicalSchemaFragmentNames([
        "error",
        "Error",
        "address",
        "Address",
        "Matter",
      ]),
    ).toEqual(["Address", "Error", "Matter"]);
  });

  it("collapses userId / UserId to the PascalCase form", () => {
    expect(canonicalSchemaFragmentNames(["User", "userId", "UserId"])).toEqual([
      "User",
      "UserId",
    ]);
  });
});
