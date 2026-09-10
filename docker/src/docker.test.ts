import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  generateDockerfiles,
  stripPackageJsonForInstall,
} from "./docker.ts";
import { monorepoPackageMock } from "./monorepo.mock.ts";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
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
    // Always includes @saflib/docker (+ deps) so the git-hashes CLI source is present.
    // Paths follow package-name sort order from getPackageRelativePaths.
    expect(dockerfile).toContain(
      "COPY --parents ./clients/web-auth ./saflib/auth-vue ./saflib/commander ./saflib/docker ./saflib/auth-spec ./saflib/monorepo ./saflib/openapi-specs ./saflib/vue-spa ./",
    );
    // Invoke by path — npm does not link bins when install runs against stubs only.
    expect(dockerfile).toContain(
      "./saflib/docker/bin/saf-git-hashes/index.ts",
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

    expect(
      vol.existsSync(
        "/app/.saf-docker/stage/foo-auth-web-client/saflib/docker/package.json",
      ),
    ).toBe(true);
  });

  it("places git hashes only at #{ git_hashes }# when the template sets it", () => {
    vol.writeFileSync(
      "/app/clients/web-auth/Dockerfile.template",
      `FROM node:20-alpine
WORKDIR /app
#{ copy_packages }#
npm install --omit=dev
#{ copy_src }#
COPY ./saflib ./saflib
#{ git_hashes }#
`,
    );
    const context = buildMonorepoContext("/app");
    generateDockerfiles(context);
    const dockerfile = vol.readFileSync(
      "/app/clients/web-auth/Dockerfile",
      "utf-8",
    ) as string;
    expect(dockerfile).toMatch(
      /COPY \.\/saflib \.\/saflib\nRUN apt-get update \\/,
    );
    const copySrcIndex = dockerfile.indexOf("COPY --parents");
    const fullSaflibIndex = dockerfile.indexOf("COPY ./saflib ./saflib");
    const hashesIndex = dockerfile.indexOf(
      "./saflib/docker/bin/saf-git-hashes/index.ts",
    );
    expect(copySrcIndex).toBeGreaterThan(-1);
    expect(fullSaflibIndex).toBeGreaterThan(copySrcIndex);
    expect(hashesIndex).toBeGreaterThan(fullSaflibIndex);
    // Hashes step should appear once (not also appended to copy_src).
    expect(
      dockerfile.split("./saflib/docker/bin/saf-git-hashes/index.ts").length - 1,
    ).toBe(1);
  });
});
