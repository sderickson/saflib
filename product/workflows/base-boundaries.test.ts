import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkBoundaries } from "@saflib/imports/boundaries";

/**
 * Violations the template carries on purpose:
 * - `clients/common` pulls the shared SCSS from `clients/build` by relative path;
 * - `lib/__package-name__` (`template-package`) has optional `bin/` and
 *   `workflows/` stubs whose dependencies are added by the workflows that
 *   create them.
 */
const ACCEPTED = [
  /^relative-escape: base\/clients\/common\/style-imports\.ts -> \.\.\/build\/[^/]+\.scss$/,
  /^undeclared: template-package -> /,
];

/**
 * `product/init` copies `base` into new products, which then run
 * `saf-imports boundaries`. Keep the template free of violations (undeclared
 * imports, missing `saf.kind`, cycles) so a new product starts with an empty
 * baseline.
 */
describe("base template boundaries", () => {
  it("has no boundary violations in base packages", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const { violations } = checkBoundaries({ root });
    const inBase = violations.filter(
      (v) =>
        (v.files.some((f) => f.startsWith("base/")) ||
          /@saflib\/base-/.test(v.key)) &&
        !ACCEPTED.some((re) => re.test(v.key)),
    );
    expect(inBase.map((v) => v.message)).toEqual([]);
  });
});
