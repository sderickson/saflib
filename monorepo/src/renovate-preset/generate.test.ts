import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProductPreset,
  collectSaflibOwnedPackages,
  writeRenovatePresets,
} from "./generate.ts";

const saflibDir = path.resolve(import.meta.dirname, "../../..");

describe("saflib's Renovate product presets", () => {
  it("are up to date with saflib's package.json files (run `npx saf-monorepo renovate-preset`)", () => {
    expect(writeRenovatePresets(saflibDir, { check: true })).toEqual([]);
  });

  it("turn off registry packages saflib declares, not its own workspace packages", () => {
    const owned = collectSaflibOwnedPackages(saflibDir);
    expect(owned).toEqual(
      expect.arrayContaining(["vue", "vite", "msw", "typescript"]),
    );
    expect(owned.some((name) => name.startsWith("@saflib/"))).toBe(false);
    expect(owned.some((name) => name.includes("__"))).toBe(false);
    const rules = buildProductPreset(saflibDir).packageRules as {
      enabled?: boolean;
    }[];
    expect(rules.filter((rule) => rule.enabled === false)).toHaveLength(3);
  });
});
