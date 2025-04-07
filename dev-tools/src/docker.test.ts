import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { generateDockerfiles } from "./docker.ts";
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

describe("generateDockerfiles", () => {
  it("should generate the correct dockerfiles", () => {
    const context = buildMonorepoContext("/app");
    generateDockerfiles(context);
    const dockerfile = vol.readFileSync(
      "/app/clients/web-auth/Dockerfile",
      "utf-8",
    );
    expect(dockerfile).toContain(
      "COPY --parents ./package.json ./package-lock.json ./saflib/vue-spa/package.json ./saflib/auth-vue/package.json ./saflib/auth-spec/package.json ./saflib/openapi-specs/package.json ./clients/web-auth/package.json ./",
    );
    expect(dockerfile).toContain(
      "COPY --parents ./saflib/vue-spa ./saflib/auth-vue ./saflib/auth-spec ./saflib/openapi-specs ./clients/web-auth ./",
    );
  });
});
