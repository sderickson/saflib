import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Build } from "./builds.ts";
import { composeImageNames, selectBuilds } from "./select.ts";

const build = (
  root: string,
  rel: string,
  pkg: string,
  image: string,
): Build => ({
  ref: `${pkg}/builds/default`,
  packageName: pkg,
  buildName: "default",
  dir: path.join(root, rel),
  templatePath: path.join(root, rel, "Dockerfile.template"),
  dockerfilePath: path.join(root, rel, "Dockerfile"),
  image,
  extraTags: [],
});

describe("composeImageNames", () => {
  it("strips registries, tags and digests", () => {
    expect(
      composeImageNames(`
services:
  caddy:
    image: acme-dev:latest
  api:
    image: "$CONTAINER_REGISTRY/acme-monolith:latest"
  db:
    image: postgres@sha256:abc
  # image: commented-out
`),
    ).toEqual(["acme-dev", "acme-monolith", "postgres"]);
  });
});

describe("selectBuilds", () => {
  let root: string;
  let all: Build[];

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "saflib-select-"));
    all = [
      build(root, "hub/dev", "@x/hub-dev", "x-hub-dev"),
      build(root, "hub/service", "@x/hub-service", "x-hub-service"),
      build(root, "blog", "@x/blog", "x-blog"),
    ];
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("selects everything when nothing is specified", () => {
    expect(selectBuilds(all, {})).toEqual(all);
  });

  it("selects only the builds under --dir, without adding everything else", () => {
    expect(
      selectBuilds(all, {
        dirs: [".."],
        cwd: path.join(root, "hub", "dev"),
      }).map((b) => b.image),
    ).toEqual(["x-hub-dev", "x-hub-service"]);
  });

  it("selects the builds a compose file uses, unioned with refs", () => {
    writeFileSync(
      path.join(root, "compose.yaml"),
      "services:\n  a:\n    image: x-hub-dev:latest\n  b:\n    image: redis:7\n",
    );
    expect(
      selectBuilds(all, {
        composeFiles: ["compose.yaml"],
        identifiers: ["@x/blog"],
        cwd: root,
      }).map((b) => b.image),
    ).toEqual(["x-blog", "x-hub-dev"]);
  });

  it("rejects selectors that match nothing", () => {
    expect(() => selectBuilds(all, { identifiers: ["@x/nope"] })).toThrow(
      /Unknown build/,
    );
    expect(() => selectBuilds(all, { dirs: ["nope"], cwd: root })).toThrow(
      /No builds under/,
    );
  });
});
