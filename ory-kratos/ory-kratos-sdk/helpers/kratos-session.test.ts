import type { Session } from "@ory/client";
import { describe, expect, it } from "vitest";
import {
  assertKratosSessionIdentityLoaded,
  kratosEmailFromSession,
} from "./kratos-session.ts";

describe("kratosEmailFromSession", () => {
  it("returns undefined when session or traits are missing", () => {
    expect(kratosEmailFromSession(undefined)).toBeUndefined();
    expect(kratosEmailFromSession(null)).toBeUndefined();
    expect(
      kratosEmailFromSession({ id: "s", active: true } as Session),
    ).toBeUndefined();
  });

  it("returns email from identity traits", () => {
    expect(
      kratosEmailFromSession({
        id: "s",
        active: true,
        identity: {
          id: "i",
          schema_id: "default",
          traits: { email: "u@example.com" },
        },
      } as Session),
    ).toBe("u@example.com");
  });
});

describe("assertKratosSessionIdentityLoaded", () => {
  it("does not throw when session has identity", () => {
    const s = {
      id: "s",
      active: true,
      identity: { id: "i", schema_id: "default", traits: {} },
    } as Session;
    expect(() => assertKratosSessionIdentityLoaded(s)).not.toThrow();
  });

  it("throws when session is missing or has no identity", () => {
    expect(() => assertKratosSessionIdentityLoaded(undefined)).toThrow(
      "Failed to load session",
    );
    expect(() =>
      assertKratosSessionIdentityLoaded({
        id: "s",
        active: true,
      } as Session),
    ).toThrow("Failed to load session");
  });
});
