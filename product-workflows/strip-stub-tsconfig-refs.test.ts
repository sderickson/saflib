import { describe, expect, it } from "vitest";
import {
  cleanTsconfigReferences,
  repairTsconfigJsonText,
} from "./strip-stub-tsconfig-refs.ts";

describe("repairTsconfigJsonText", () => {
  it("removes trailing commas left when the last stub ref line was dropped", () => {
    const broken = `{
  "references": [
    {
      "path": "../db"
    },

  ]
}
`;
    expect(() => JSON.parse(broken)).toThrow();
    const fixed = repairTsconfigJsonText(broken);
    expect(JSON.parse(fixed)).toEqual({
      references: [{ path: "../db" }],
    });
  });

  it("removes empty objects left when a multi-line stub path was dropped", () => {
    const broken = `{
  "references": [
    {
      "path": "../db"
    },
    {

    }
  ]
}
`;
    const fixed = repairTsconfigJsonText(broken);
    expect(JSON.parse(fixed)).toEqual({
      references: [{ path: "../db" }],
    });
  });
});

describe("cleanTsconfigReferences", () => {
  it("drops stub paths and missing path entries", () => {
    const config = {
      references: [
        { path: "../db" },
        { path: "../integrations/__integration-name__" },
        {},
      ],
    };
    expect(cleanTsconfigReferences(config)).toBe(true);
    expect(config.references).toEqual([{ path: "../db" }]);
  });
});
