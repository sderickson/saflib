import { describe, expect, it } from "vitest";
import { initialsFor } from "./initials.ts";

describe("initialsFor", () => {
  it("uses first and last name", () => {
    expect(initialsFor("Ada King Lovelace", null)).toBe("AL");
  });
  it("falls back to the email", () => {
    expect(initialsFor(null, "grace.hopper@example.com")).toBe("GR");
    expect(initialsFor(null, null)).toBe("?");
  });
});
