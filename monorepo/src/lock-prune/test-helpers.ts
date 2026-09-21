import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import {
  createFixtureRoot,
  removeFixtureRoot,
  writeFixtureTree,
} from "../test-fixtures/fs-fixture.ts";

let fixtureRoot = "";

/** Shared product-repo temp tree for lock-prune module tests. */
export function loadProductFixture(files: Record<string, string>): string {
  if (fixtureRoot) {
    removeFixtureRoot(fixtureRoot);
  }
  fixtureRoot = createFixtureRoot("lock-prune");
  writeFixtureTree(fixtureRoot, files, "/product");
  return fixtureRoot;
}

export function readProductFile(relativePath: string): string {
  return readFileSync(join(fixtureRoot, relativePath), "utf8");
}

export function getFixtureRoot(): string {
  return fixtureRoot;
}

export function useProductFixtureLifecycle(): void {
  beforeEach(() => {
    fixtureRoot = createFixtureRoot("lock-prune-empty");
  });

  afterEach(() => {
    if (fixtureRoot) {
      removeFixtureRoot(fixtureRoot);
      fixtureRoot = "";
    }
  });
}

export {
  createFixtureRoot,
  removeFixtureRoot,
  writeFixtureTree,
};
