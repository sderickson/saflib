import { describe, expect, it } from "vitest";
import {
  isSiteAdminEmail,
  parseAdminEmails,
} from "./site-admin.logic.ts";

describe("parseAdminEmails", () => {
  it("splits and normalizes", () => {
    expect(parseAdminEmails(" Admin@Example.com , other@x.com ")).toEqual([
      "admin@example.com",
      "other@x.com",
    ]);
  });

  it("returns empty for blank input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
  });
});

describe("isSiteAdminEmail", () => {
  const admins = ["admin@saflib.com"];

  it("matches configured emails case-insensitively", () => {
    expect(isSiteAdminEmail("Admin@Saflib.com", admins)).toBe(true);
    expect(isSiteAdminEmail("user@example.com", admins)).toBe(false);
  });

  it("is false for missing email", () => {
    expect(isSiteAdminEmail(undefined, admins)).toBe(false);
    expect(isSiteAdminEmail("", admins)).toBe(false);
  });
});
