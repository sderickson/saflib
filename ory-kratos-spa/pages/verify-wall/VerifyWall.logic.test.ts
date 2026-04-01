import type { Session } from "@ory/client";
import { describe, expect, it } from "vitest";
import {
  resolveVerifyWallReturnToDestination,
  sessionDisplayEmail,
} from "./VerifyWall.logic.ts";

describe("resolveVerifyWallReturnToDestination", () => {
  it("uses the return_to query when it is a non-empty string", () => {
    expect(resolveVerifyWallReturnToDestination("https://app.example/after", "https://fallback")).toBe(
      "https://app.example/after",
    );
  });

  it("trims the return_to query", () => {
    expect(resolveVerifyWallReturnToDestination("  https://x  ", "https://fallback")).toBe("https://x");
  });

  it("uses the fallback when return_to is missing or blank", () => {
    expect(resolveVerifyWallReturnToDestination(undefined, "https://fallback")).toBe("https://fallback");
    expect(resolveVerifyWallReturnToDestination("", "https://fallback")).toBe("https://fallback");
    expect(resolveVerifyWallReturnToDestination("   ", "https://fallback")).toBe("https://fallback");
  });
});

describe("sessionDisplayEmail", () => {
  it("prefers traits.email when present", () => {
    expect(
      sessionDisplayEmail({
        id: "s",
        identity: {
          id: "i",
          schema_id: "x",
          traits: { email: "traits@example.com" },
          verifiable_addresses: [{ value: "other@example.com", verified: false, via: "email", status: "pending" }],
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
