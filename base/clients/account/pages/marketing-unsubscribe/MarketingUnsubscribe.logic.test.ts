import { describe, expect, it } from "vitest";
import {
  emailFromSearch,
  parseMarketingUnsubscribeEmail,
} from "./MarketingUnsubscribe.logic.ts";

describe("emailFromSearch", () => {
  it("preserves plus-addressing from a bare + in the query", () => {
    expect(emailFromSearch("?email=user+tag@example.com")).toBe(
      "user+tag@example.com",
    );
  });

  it("decodes percent-encoded email", () => {
    expect(emailFromSearch("?email=user%2Btag%40example.com")).toBe(
      "user+tag@example.com",
    );
  });
});

describe("parseMarketingUnsubscribeEmail", () => {
  it("reads a non-empty email query param", () => {
    expect(parseMarketingUnsubscribeEmail({ email: " alex@example.com " })).toBe(
      "alex@example.com",
    );
  });

  it("prefers raw search so + is not turned into a space", () => {
    expect(
      parseMarketingUnsubscribeEmail(
        { email: "user tag@example.com" },
        "/unsubscribe?email=user+tag@example.com",
      ),
    ).toBe("user+tag@example.com");
  });

  it("returns undefined when missing or blank", () => {
    expect(parseMarketingUnsubscribeEmail({})).toBeUndefined();
    expect(parseMarketingUnsubscribeEmail({ email: "  " })).toBeUndefined();
    expect(parseMarketingUnsubscribeEmail({ email: ["a@b.c"] })).toBeUndefined();
  });
});
