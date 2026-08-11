import { describe, expect, it } from "vitest";
import AjvDefault from "ajv";
const Ajv = AjvDefault as unknown as typeof import("ajv").default;
import {
  lenientEmailValidate,
  registerLenientOpenApiAjvFormats,
} from "./ajv-formats.ts";

describe("lenientEmailValidate", () => {
  it("accepts common addresses including plus-tags", () => {
    expect(lenientEmailValidate("alex@example.com")).toBe(true);
    expect(lenientEmailValidate("user+tag@example.co.uk")).toBe(true);
    expect(lenientEmailValidate("  spaced@example.com  ")).toBe(true);
  });

  it("rejects obvious non-emails", () => {
    expect(lenientEmailValidate("")).toBe(false);
    expect(lenientEmailValidate("not-an-email")).toBe(false);
    expect(lenientEmailValidate("@example.com")).toBe(false);
    expect(lenientEmailValidate("user@")).toBe(false);
    expect(lenientEmailValidate("user@nodot")).toBe(false);
    expect(lenientEmailValidate("user @example.com")).toBe(false);
  });
});

describe("registerLenientOpenApiAjvFormats", () => {
  it("registers email before compiling schemas with format: email", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    registerLenientOpenApiAjvFormats(
      ajv as Parameters<typeof registerLenientOpenApiAjvFormats>[0],
    );
    ajv.addSchema(
      {
        oneOf: [
          { type: "string", enum: [""] },
          { type: "string", format: "email" },
        ],
      },
      "#/components/schemas/email-address",
    );
    expect(ajv.getSchema("#/components/schemas/email-address")).toBeDefined();
  });
});
