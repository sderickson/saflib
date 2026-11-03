import { beforeEach, describe, expect, it } from "vitest";
import { setClientName } from "@saflib/links";
import {
  buildAccountHomeNavItems,
  resolveAccountHomeNavActiveId,
} from "./Home.logic.ts";

beforeEach(() => {
  setClientName("account");
});

describe("buildAccountHomeNavItems", () => {
  it("includes profile and Kratos settings links", () => {
    const ids = buildAccountHomeNavItems().map((item) => item.id);
    expect(ids).toEqual(["profile", "email", "password", "mfa", "sessions"]);
  });
});

describe("resolveAccountHomeNavActiveId", () => {
  it("matches the current path", () => {
    const items = buildAccountHomeNavItems();
    expect(resolveAccountHomeNavActiveId("/mfa", items)).toBe("mfa");
    expect(resolveAccountHomeNavActiveId("/profile", items)).toBe("profile");
  });

  it("returns undefined when nothing matches", () => {
    const items = buildAccountHomeNavItems();
    expect(resolveAccountHomeNavActiveId("/unknown", items)).toBeUndefined();
  });
});
