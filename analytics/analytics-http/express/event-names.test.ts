import { describe, it, expect } from "vitest";
import { productEventNames } from "./event-names.ts";

describe("productEventNames", () => {
  it("collects event enums through refs and oneOf", () => {
    const spec = {
      components: {
        schemas: {
          ProductEvent: { $ref: "#/components/schemas/index" },
          index: { oneOf: [{ $ref: "#/components/schemas/login" }, { $ref: "#/components/schemas/signup" }] },
          login: { properties: { event: { enum: ["login"] } } },
          signup: { properties: { event: { enum: ["signup", "signup_view"] } } },
        },
      },
    };
    expect(productEventNames(spec)).toEqual(["login", "signup", "signup_view"]);
    expect(productEventNames({})).toEqual([]);
  });
});
