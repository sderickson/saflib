import { describe, expect, it } from "vitest";
import { fixRelativePaths } from "./fix-product-relative-paths.ts";

describe("fixRelativePaths", () => {
  it("points saflib library paths at the embedded saflib/", () => {
    // base/product/service/db/tsconfig.json → <product>/service/db/tsconfig.json
    expect(fixRelativePaths(`"path": "../../../../drizzle"`, 2, true)).toBe(
      `"path": "../../../saflib/drizzle"`,
    );
  });

  it("maps bare monorepo-root paths to the product repo root", () => {
    // base/product/dev/docker-compose.yaml → <product>/dev/docker-compose.yaml
    expect(fixRelativePaths("      context: ../../..\n", 1, true)).toBe(
      "      context: ../..\n",
    );
    expect(fixRelativePaths("      - ../../..:/app\n", 1, true)).toBe(
      "      - ../..:/app\n",
    );
  });

  it("drops one level without saflib/ when the product lives in saflib itself", () => {
    expect(fixRelativePaths(`"../../../../vue/tsconfig.app.base.json"`, 2, false)).toBe(
      `"../../../vue/tsconfig.app.base.json"`,
    );
  });

  it("leaves paths inside the product alone", () => {
    const text = `"path": "../common", "../../service/db"`;
    expect(fixRelativePaths(text, 2, true)).toBe(text);
  });
});
