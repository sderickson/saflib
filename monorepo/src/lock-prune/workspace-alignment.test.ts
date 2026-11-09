import { describe, expect, it } from "vitest";
import {
  findDependencyMisalignment,
  formatDependencyMisalignment,
} from "./workspace-alignment.ts";

describe("findDependencyMisalignment", () => {
  it("reports a workspace that needs a different version than the root", () => {
    const alignment = findDependencyMisalignment({
      "": { dependencies: { vue: "^3.5.0" } },
      "saflib/vue": { dependencies: { vue: "^3.4.0 <3.5.0" } },
      "node_modules/vue": { version: "3.5.1" },
      "saflib/vue/node_modules/vue": { version: "3.4.9" },
    });
    expect(alignment.duplicated).toEqual([]);
    expect(alignment.misaligned).toHaveLength(1);
    expect(alignment.misaligned[0]).toContain(
      "vue: 3.4.9 installed under saflib/vue/node_modules, 3.5.1 at the root",
    );
  });

  it("reports a same-version copy separately, with how to remove it", () => {
    const alignment = findDependencyMisalignment({
      "saflib/vitepress": { dependencies: { esbuild: "^0.27.0" } },
      "node_modules/esbuild": { version: "0.27.7" },
      "saflib/vitepress/node_modules/esbuild": { version: "0.27.7" },
      "saflib/vitepress/node_modules/esbuild/node_modules/x": {
        version: "1.0.0",
      },
    });
    expect(alignment.misaligned).toEqual([]);
    expect(alignment.duplicated).toEqual([
      "  esbuild@0.27.7: saflib/vitepress/node_modules/esbuild",
    ]);
    expect(formatDependencyMisalignment(alignment, "[deps]")).toContain(
      "Delete those entries",
    );
  });

  it("passes a lockfile with everything at the root", () => {
    const alignment = findDependencyMisalignment({
      "": { dependencies: { vue: "^3.5.0" } },
      "node_modules/vue": { version: "3.5.1" },
      "node_modules/vue/node_modules/x": { version: "1.0.0" },
    });
    expect(formatDependencyMisalignment(alignment, "[deps]")).toBeUndefined();
  });
});
