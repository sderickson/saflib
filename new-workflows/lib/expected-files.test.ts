import { describe, it, expect } from "vitest";
import { findUnexpectedFiles } from "./expected-files.ts";

describe("findUnexpectedFiles", () => {
  const base = {
    repoRoot: "/repo",
    runCwd: "/repo",
    copiedFiles: [],
  };

  it("keeps files matched by neither a declared path, a glob nor a copied file", () => {
    expect(
      findUnexpectedFiles({
        ...base,
        changedFiles: [
          "app/spec/routes/widgets/list.yaml",
          "app/spec/openapi.yaml",
          "app/http/handlers/widgets/list.ts",
          "app/security/vitest.config.js",
          "app/package-lock.json",
        ],
        expectedFiles: ["app/spec/routes/widgets/**", "app/spec/openapi.yaml", "app/http/handlers"],
      }),
    ).toEqual(["app/security/vitest.config.js"]);
  });

  it("allows files a copy step wrote", () => {
    expect(
      findUnexpectedFiles({
        ...base,
        changedFiles: ["app/db/queries/widget/create.ts", "app/db/index.ts"],
        expectedFiles: ["app/db/index.ts"],
        copiedFiles: ["/repo/app/db/queries/widget/create.ts"],
      }),
    ).toEqual([]);
  });

  it("resolves declared paths against the run's starting directory", () => {
    expect(
      findUnexpectedFiles({
        ...base,
        runCwd: "/repo/app",
        changedFiles: ["app/spec/openapi.yaml", "spec/openapi.yaml"],
        expectedFiles: ["spec/openapi.yaml"],
      }),
    ).toEqual(["spec/openapi.yaml"]);
  });
});
