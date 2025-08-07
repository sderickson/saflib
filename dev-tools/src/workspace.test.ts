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
    expect(monorepoPackageJsons["@saflib/express"]).toBeDefined();
  });

  it("should recursively find packages with /** workspaces", () => {
    const { monorepoPackageJsons } = getMonorepoPackages("/app");

    // should find packages at different nesting levels under libs/**
    expect(monorepoPackageJsons["@foo/utils"]).toBeDefined();
    expect(monorepoPackageJsons["@foo/utils"].dependencies?.["lodash"]).toBe(
      "4.17.21",
    );

    expect(monorepoPackageJsons["@foo/common"]).toBeDefined();
    expect(
      monorepoPackageJsons["@foo/common"].dependencies?.["@foo/utils"],
    ).toBe("*");
    expect(monorepoPackageJsons["@foo/common"].dependencies?.["moment"]).toBe(
      "2.29.4",
    );

    expect(monorepoPackageJsons["@foo/validators"]).toBeDefined();
    expect(
      monorepoPackageJsons["@foo/validators"].dependencies?.["@foo/common"],
    ).toBe("*");
    expect(monorepoPackageJsons["@foo/validators"].dependencies?.["joi"]).toBe(
      "17.9.2",
    );
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

  it("should include nested package dependencies in dependency graph", () => {
    const { monorepoPackageJsons } = getMonorepoPackages("/app");
    const dependencyGraph = buildWorkspaceDependencyGraph(monorepoPackageJsons);

    expect(dependencyGraph["@foo/common"]).toStrictEqual(["@foo/utils"]);
    expect(dependencyGraph["@foo/validators"]).toStrictEqual(["@foo/common"]);
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
        "@saflib/identity-spec",
        "@saflib/openapi",
      ]),
    );
  });

  it("should return transitive dependencies for nested packages", () => {
    const context = buildMonorepoContext("/app");
    const dependencies = getAllPackageWorkspaceDependencies(
      "@foo/validators",
      context,
    );
    expect(dependencies).toStrictEqual(new Set(["@foo/common", "@foo/utils"]));
  });
});
