import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  generateDockerfiles,
  stripPackageJsonForInstall,
} from "./docker.ts";
import { monorepoPackageMock } from "./monorepo.mock.ts";
import { buildMonorepoContext } from "./workspace.ts";
vi.mock("node:fs");
vi.mock("node:fs/promises");

beforeEach(() => {
  vol.fromJSON(monorepoPackageMock);
});

afterEach(() => {
  vol.reset();
});

describe("stripPackageJsonForInstall", () => {
  it("keeps only deps-relevant fields", () => {
    const stripped = stripPackageJsonForInstall({
      name: "@foo/auth-web-client",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: { build: "vite build" },
      exports: { ".": "./dist/index.js" },
      safImports: { foo: "bar" },
      dependencies: { "@saflib/vue": "*" },
      devDependencies: { vitest: "*" },
      engines: { node: ">=20" },
    });
    expect(stripped).toEqual({
      name: "@foo/auth-web-client",
      version: "1.0.0",
      private: true,
      type: "module",
      dependencies: { "@saflib/vue": "*" },
      devDependencies: { vitest: "*" },
      engines: { node: ">=20" },
    });
    expect(stripped).not.toHaveProperty("exports");
    expect(stripped).not.toHaveProperty("scripts");
    expect(stripped).not.toHaveProperty("safImports");
  });
});

describe("generateDockerfiles", () => {
  it("should generate the correct dockerfiles", () => {
    const context = buildMonorepoContext("/app");
    generateDockerfiles(context);
    const dockerfile = vol.readFileSync(
      "/app/clients/web-auth/Dockerfile",
      "utf-8",
    );
    expect(dockerfile).toContain(
      "COPY .saf-docker/stage/foo-auth-web-client/ ./",
    );
    expect(dockerfile).toContain(
      "COPY --parents ./clients/web-auth ./saflib/auth-vue ./saflib/auth-spec ./saflib/openapi-specs ./saflib/vue-spa ./",
    );

    const stagedPackageJson = JSON.parse(
      vol.readFileSync(
        "/app/.saf-docker/stage/foo-auth-web-client/clients/web-auth/package.json",
        "utf-8",
      ) as string,
    );
    expect(stagedPackageJson).not.toHaveProperty("exports");
    expect(stagedPackageJson).not.toHaveProperty("scripts");
    expect(stagedPackageJson).not.toHaveProperty("safImports");
    expect(stagedPackageJson.name).toBe("@foo/auth-web-client");
  });
});
