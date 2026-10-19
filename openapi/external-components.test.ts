import { describe, expect, it } from "vitest";
import {
  EXTERNAL_COMPONENTS_KEY,
  mergeExternalComponents,
} from "./external-components.ts";

describe("mergeExternalComponents", () => {
  it("restores omitted components from their owners", () => {
    const slim = {
      openapi: "3.0.0",
      components: { schemas: { Local: { type: "string" } } },
      [EXTERNAL_COMPONENTS_KEY]: { Shared: "owner-pkg" },
    };
    const owner = {
      components: { schemas: { Shared: { type: "integer" } } },
    };
    expect(mergeExternalComponents(slim, { "owner-pkg": owner })).toEqual({
      openapi: "3.0.0",
      components: {
        schemas: { Local: { type: "string" }, Shared: { type: "integer" } },
      },
    });
  });

  it("unwraps JSON module namespaces and passes complete documents through", () => {
    const doc = { openapi: "3.0.0", components: { schemas: {} } };
    expect(mergeExternalComponents({ default: doc }, {})).toBe(doc);
  });

  it("throws when an owner lacks the component", () => {
    expect(() =>
      mergeExternalComponents(
        { [EXTERNAL_COMPONENTS_KEY]: { Missing: "owner-pkg" } },
        { "owner-pkg": { components: { schemas: {} } } },
      ),
    ).toThrow(/does not define component Missing/);
  });
});
