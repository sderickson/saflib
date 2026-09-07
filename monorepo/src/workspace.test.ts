import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildMonorepoContext,
  getMonorepoPackages,
  buildWorkspaceDependencyGraph,
  findPackagesWithDockerfileTemplates,
  getAllPackageWorkspaceDependencies,
} from "@saflib/monorepo/workspace";
import { monorepoPackageMock } from "./monorepo.mock.ts";
import {
  createFixtureRoot,
  removeFixtureRoot,
  writeFixtureTree,
} from "./test-fixtures/fs-fixture.ts";

let fixtureRoot = "";

beforeEach(() => {
  fixtureRoot = createFixtureRoot("workspace");
  writeFixtureTree(fixtureRoot, monorepoPackageMock, "/app");
});

afterEach(() => {
  removeFixtureRoot(fixtureRoot);
});

describe("getMonorepoPackageJsons", () => {
  it("should return all workspace packages", () => {
    const { monorepoPackageJsons } = getMonorepoPackages(fixtureRoot);
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
    const { monorepoPackageJsons } = getMonorepoPackages(fixtureRoot);

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
    const { monorepoPackageJsons } = getMonorepoPackages(fixtureRoot);
    const dependencyGraph = buildWorkspaceDependencyGraph(monorepoPackageJsons);
    expect(dependencyGraph).toBeDefined();
    expect(dependencyGraph["@foo/auth-web-client"]).toStrictEqual([
      "@saflib/vue",
      "@saflib/auth",
    ]);
  });

  it("should include nested package dependencies in dependency graph", () => {
    const { monorepoPackageJsons } = getMonorepoPackages(fixtureRoot);
    const dependencyGraph = buildWorkspaceDependencyGraph(monorepoPackageJsons);

    expect(dependencyGraph["@foo/common"]).toStrictEqual(["@foo/utils"]);
    expect(dependencyGraph["@foo/validators"]).toStrictEqual(["@foo/common"]);
  });
});

describe("findPackagesWithDockerfileTemplates", () => {
  it("should return the correct packages", () => {
    const { monorepoPackageDirectories } = getMonorepoPackages(fixtureRoot);
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
    const context = buildMonorepoContext(fixtureRoot);
    const dependencies = getAllPackageWorkspaceDependencies(
      "@foo/auth-web-client",
      context,
    );
    expect(dependencies).toStrictEqual(
      new Set([
        "@saflib/vue",
        "@saflib/auth",
        "@saflib/identity-spec",
        "@saflib/openapi",
      ]),
    );
  });

  it("should return transitive dependencies for nested packages", () => {
    const context = buildMonorepoContext(fixtureRoot);
    const dependencies = getAllPackageWorkspaceDependencies(
      "@foo/validators",
      context,
    );
    expect(dependencies).toStrictEqual(new Set(["@foo/common", "@foo/utils"]));
  });
});
