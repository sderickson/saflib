import { describe, expect, it } from "vitest";
import {
  moduleTargetFromImport,
  packageLocalPath,
  resolveRelative,
  stripTsExt,
} from "./import-resolution.ts";

describe("import-resolution", () => {
  it("resolveRelative joins and normalizes ..", () => {
    expect(resolveRelative("a/b/c.ts", "./d")).toBe("a/b/d");
    expect(resolveRelative("a/b/c.ts", "../x")).toBe("a/x");
    expect(resolveRelative("a/b/c.ts", "../../y")).toBe("y");
  });

  it("stripTsExt removes source extensions", () => {
    expect(stripTsExt("foo.ts")).toBe("foo");
    expect(stripTsExt("foo.tsx")).toBe("foo");
    expect(stripTsExt("foo.js")).toBe("foo");
  });

  it("moduleTargetFromImport resolves package-absolute imports", () => {
    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/service/http/routes/x.ts",
        "@pathclerk/daemon-form-artifacts/paths/form-artifact-paths",
      ),
    ).toBe("form-artifact-paths");

    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/service/http/routes/x.ts",
        "@pathclerk/daemon-form-artifacts/interpreter-statement/types",
      ),
    ).toBe("interpreter-statement/types");
  });

  it("moduleTargetFromImport resolves relative imports inside the package", () => {
    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/form-artifacts/load-builtin-form-artifacts.ts",
        "./form-artifact-paths",
      ),
    ).toBe("form-artifact-paths");

    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/form-artifacts/lib/foo.ts",
        "../bar",
      ),
    ).toBe("bar");
  });

  it("moduleTargetFromImport ignores other packages and out-of-package relatives", () => {
    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/service/http/x.ts",
        "@pathclerk/daemon-db/queries/matter/create",
      ),
    ).toBeNull();

    expect(
      moduleTargetFromImport(
        "@pathclerk/daemon-form-artifacts",
        "daemon/form-artifacts",
        "daemon/service/http/x.ts",
        "./local",
      ),
    ).toBeNull();
  });

  it("packageLocalPath strips package directory", () => {
    expect(
      packageLocalPath(
        "daemon/service/http/routes/x.ts",
        "daemon/service/http",
      ),
    ).toBe("routes/x.ts");
  });
});
