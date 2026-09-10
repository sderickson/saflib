import type { Identity } from "@ory/client";
import { describe, expect, it } from "vitest";
import { identityNeedsEmailVerification } from "./kratos-identity.ts";

describe("identityNeedsEmailVerification", () => {
  it("returns false when identity is missing or has no email verifiable addresses", () => {
    expect(identityNeedsEmailVerification(undefined)).toBe(false);
    expect(identityNeedsEmailVerification({ id: "x", schema_id: "s", traits: {} } as Identity)).toBe(
      false,
    );
  });

  it("returns true when any email address is not verified", () => {
    expect(
      identityNeedsEmailVerification({
        id: "x",
        schema_id: "s",
        traits: {},
        verifiable_addresses: [
          { value: "a@b.c", verified: false, via: "email", status: "pending" },
        ],
      } as Identity),
    ).toBe(true);
  });

  it("returns false when all email addresses are verified", () => {
    expect(
      identityNeedsEmailVerification({
        id: "x",
        schema_id: "s",
        traits: {},
        verifiable_addresses: [
          { value: "a@b.c", verified: true, via: "email", status: "completed" },
        ],
      } as Identity),
    ).toBe(false);
  });
});
