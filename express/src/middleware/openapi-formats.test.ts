import { describe, expect, it } from "vitest";
import { lenientEmailOpenApiFormat } from "./openapi-formats.ts";

const validate = lenientEmailOpenApiFormat.validate;

describe("lenientEmailOpenApiFormat", () => {
  it("accepts common addresses including plus-tags", () => {
    expect(validate("alex@example.com")).toBe(true);
    expect(validate("user+tag@example.co.uk")).toBe(true);
    expect(validate("  spaced@example.com  ")).toBe(true);
  });

  it("rejects obvious non-emails", () => {
    expect(validate("")).toBe(false);
    expect(validate("not-an-email")).toBe(false);
    expect(validate("@example.com")).toBe(false);
    expect(validate("user@")).toBe(false);
    expect(validate("user@nodot")).toBe(false);
    expect(validate("user @example.com")).toBe(false);
  });
});
