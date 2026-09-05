import { describe, expect, it } from "vitest";
import { isKratosPropertyMissingMessage } from "./kratosUiMessages.ts";

describe("isKratosPropertyMissingMessage", () => {
  it("matches Kratos validation copy", () => {
    expect(
      isKratosPropertyMissingMessage({
        id: 1,
        type: "error",
        text: "Property password is missing.",
      }),
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(
      isKratosPropertyMissingMessage({
        id: 1,
        type: "error",
        text: "Password is too short",
      }),
    ).toBe(false);
  });
});
