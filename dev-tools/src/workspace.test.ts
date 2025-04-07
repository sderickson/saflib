import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  // generateDockerfile,
  getMonorepoPackages,
  buildWorkspaceDependencyGraph,
  findPackagesWithDockerfileTemplates,
  getAllPackageWorkspaceDependencies,
  buildMonorepoContext,
} from "./workspace.ts";
import { monorepoPackageMock } from "./monorepo.mock.ts";
vi.mock("node:fs");
vi.mock("node:fs/promises");

beforeEach(() => {
  vol.fromJSON(monorepoPackageMock);
});

afterEach(() => {
  vol.reset();
});

describe("getMonorepoPackageJsons", () => {
  it("should return all workspace packages", () => {
    const { monorepoPackageJsons } = getMonorepoPackages("/app");
    expect(monorepoPackageJsons).toBeDefined();
    expect(monorepoPackageJsons["@foo/foo"]).toBeDefined();
    expect(monorepoPackageJsons["@foo/foo"].workspaces).toBeDefined();

    // it should gather specific packages listed in workspaces
    expect(monorepoPackageJsons["@foo/main-db"]).toBeDefined();
    expect(
      monorepoPackageJsons["@foo/main-db"].dependencies?.["third-party-lib"],
    ).toBeDefined();

    // it should gather packages in sub-folders
    expect(monorepoPackageJsons["@foo/api-service"]).toBeDefined();
    expect(monorepoPackageJsons["@saflib/node-express"]).toBeDefined();
  });
});

describe("buildWorkspaceDependencyGraph", () => {
  it("should return the correct dependency graph", () => {
    const { monorepoPackageJsons } = getMonorepoPackages("/app");
    const dependencyGraph = buildWorkspaceDependencyGraph(monorepoPackageJsons);
    expect(dependencyGraph).toBeDefined();
    expect(dependencyGraph["@foo/auth-web-client"]).toStrictEqual([
      "@saflib/vue-spa",
      "@saflib/auth-vue",
    ]);
  });
});

describe("findPackagesWithDockerfileTemplates", () => {
  it("should return the correct packages", () => {
    const { monorepoPackageDirectories } = getMonorepoPackages("/app");
    const packages = findPackagesWithDockerfileTemplates(
      monorepoPackageDirectories,
    );
    expect(packages).toStrictEqual([
      "@foo/auth-web-client",
      "@foo/www-web-client",
      "@foo/api-service",
      "@foo/auth-service",
    ]);
  });
});

describe("getAllPackageWorkspaceDependencies", () => {
  it("should return the correct dependencies", () => {
    const context = buildMonorepoContext("/app");
    const dependencies = getAllPackageWorkspaceDependencies(
      "@foo/auth-web-client",
      context,
    );
    expect(dependencies).toStrictEqual(
      new Set([
        "@saflib/vue-spa",
        "@saflib/auth-vue",
        "@saflib/auth-spec",
        "@saflib/openapi-specs",
      ]),
    );
  });
});
