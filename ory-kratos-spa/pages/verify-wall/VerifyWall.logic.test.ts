import type { Session } from "@ory/client";
import { describe, expect, it } from "vitest";
import { sessionDisplayEmail } from "./VerifyWall.logic.ts";

describe("sessionDisplayEmail", () => {
  it("prefers traits.email when present", () => {
    expect(
      sessionDisplayEmail({
        id: "s",
        identity: {
          id: "i",
          schema_id: "x",
          traits: { email: "traits@example.com" },
          verifiable_addresses: [
            {
              value: "other@example.com",
              verified: false,
              via: "email",
              status: "pending",
            },
          ],
        },
      } as Session),
    ).toBe("traits@example.com");
  });

  it("falls back to the first email verifiable address", () => {
    expect(
      sessionDisplayEmail({
        id: "s",
        identity: {
          id: "i",
          schema_id: "x",
          traits: {},
          verifiable_addresses: [
            { value: "a@b.c", verified: false, via: "email", status: "pending" },
          ],
        },
      } as Session),
    ).toBe("a@b.c");
  });
});
