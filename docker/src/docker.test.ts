import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import {
  generateDockerfiles,
  stageRootPackageName,
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

describe("stageRootPackageName", () => {
  it("suffixes the image name so staged roots do not collide with the monorepo root", () => {
    expect(stageRootPackageName("@pathclerk/pathclerk", "pathclerk-daemon-monolith")).toBe(
      "@pathclerk/pathclerk--docker-pathclerk-daemon-monolith",
    );
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
    // Only the package and its workspace deps, in package-name sort order.
    expect(dockerfile).toContain(
      "COPY --parents ./clients/web-auth ./saflib/auth-vue ./saflib/auth-spec ./saflib/openapi-specs ./saflib/vue-spa ./",
    );
    // No in-image git / saf-git-hashes step anymore; metadata comes last.
    expect(dockerfile).not.toContain("saf-git-hashes");
    expect(dockerfile).not.toContain("apt-get");
    expect(dockerfile).toMatch(
      /ARG SAF_BUILD_INFO\nRUN mkdir -p \/etc\/saf\/builds && .*\/etc\/saf\/builds\/foo-auth-web-client\.json; fi\n$/,
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

    const stagedRootPackageJson = JSON.parse(
      vol.readFileSync(
        "/app/.saf-docker/stage/foo-auth-web-client/package.json",
        "utf-8",
      ) as string,
    );
    expect(stagedRootPackageJson.name).toBe(
      "@foo/foo--docker-foo-auth-web-client",
    );
    expect(stagedRootPackageJson.private).toBe(true);
    expect(stagedRootPackageJson.overrides).toEqual({ esbuild: "^0.28.0" });

    expect(
      vol.existsSync(
        "/app/.saf-docker/stage/foo-auth-web-client/saflib/docker/package.json",
      ),
    ).toBe(false);
  });

  it("drops the deprecated #{ git_hashes }# marker", () => {
    vol.writeFileSync(
      "/app/clients/web-auth/Dockerfile.template",
      `FROM node:20-alpine
WORKDIR /app
#{ copy_packages }#
#{ copy_src }#
COPY ./saflib ./saflib
#{ git_hashes }#
CMD ["npm", "start"]
`,
    );
    generateDockerfiles(buildMonorepoContext("/app"));
    const dockerfile = vol.readFileSync(
      "/app/clients/web-auth/Dockerfile",
      "utf-8",
    ) as string;
    expect(dockerfile).not.toContain("git_hashes");
    expect(dockerfile).toContain(
      'COPY ./saflib ./saflib\nCMD ["npm", "start"]\n',
    );
  });

  it("generates builds/ builds, resolves #{ image }# markers, and copies upstream metadata", () => {
    vol.mkdirSync("/app/services/identity/builds/edge/arm", { recursive: true });
    vol.writeFileSync(
      "/app/services/identity/builds/edge/arm/Dockerfile.template",
      `FROM #{ image @foo/api-service }# AS api
FROM #{ image @foo/auth-service/builds/default }#
COPY --from=api /app/out /srv
USER 1000
`,
    );
    vol.writeFileSync(
      "/app/services/identity/builds/edge/arm/build.json",
      JSON.stringify({ image: "foo-edge", tags: ["v1"] }),
    );
    const builds = generateDockerfiles(buildMonorepoContext("/app"));
    const edge = builds.find((b) => b.ref === "@foo/auth-service/builds/edge/arm");
    expect(edge).toMatchObject({ image: "foo-edge", extraTags: ["v1"] });

    const dockerfile = vol.readFileSync(
      "/app/services/identity/builds/edge/arm/Dockerfile",
      "utf-8",
    ) as string;
    expect(dockerfile).toContain("FROM foo-api-service:latest AS api\n");
    expect(dockerfile).toContain("FROM foo-auth-service:latest\n");
    // Final stage already inherits the auth-service infos; only `api` is copied.
    // The image's final USER is restored after the root-only metadata step.
    expect(dockerfile).toMatch(
      /USER root\nCOPY --from=api \/etc\/saf\/builds\/ \/etc\/saf\/builds\/\nARG SAF_BUILD_INFO\nRUN .*foo-edge\.json; fi\nUSER 1000\n$/,
    );
    // No install markers, so nothing is staged for it.
    expect(vol.existsSync("/app/.saf-docker/stage/foo-edge")).toBe(false);
  });

  it("leaves non-identifier text like `#{ image … }#` in comments alone", () => {
    vol.writeFileSync(
      "/app/clients/web-auth/Dockerfile.template",
      "# use #{ image … }# to name upstreams\nFROM node:20-alpine\n",
    );
    generateDockerfiles(buildMonorepoContext("/app"));
    expect(
      vol.readFileSync("/app/clients/web-auth/Dockerfile", "utf-8"),
    ).toContain("# use #{ image … }# to name upstreams\n");
  });

  it("rejects #{ image }# markers that name no build", () => {
    vol.writeFileSync(
      "/app/clients/web-auth/Dockerfile.template",
      "FROM #{ image @foo/nope }#\n",
    );
    expect(() => generateDockerfiles(buildMonorepoContext("/app"))).toThrow(
      /unknown build "@foo\/nope"/,
    );
  });
});
