import { describe, expect, it } from "vitest";
import {
  packagesDependingOn,
  specPackageNamesFromDeps,
  type PackageManifest,
} from "./package-manifests.ts";

function manifest(
  partial: Pick<PackageManifest, "package_name" | "kind"> &
    Partial<PackageManifest>,
): PackageManifest {
  return {
    directory: "",
    json: {},
    mixedIdentifiers: [],
    ...partial,
  };
}

describe("specPackageNamesFromDeps", () => {
  it("returns spec-kind dependencies, sorted", () => {
    const billingSpec = manifest({
      package_name: "@scope/billing-spec",
      kind: "spec",
    });
    const otherSpec = manifest({
      package_name: "@scope/other-spec",
      kind: "spec",
    });
    const http = manifest({
      package_name: "@scope/billing-http",
      kind: "http",
      json: {
        dependencies: {
          "@scope/other-spec": "*",
          "@scope/billing-spec": "*",
          "@saflib/express": "*",
        },
      },
    });
    const byName = new Map([
      [billingSpec.package_name, billingSpec],
      [otherSpec.package_name, otherSpec],
      [http.package_name, http],
    ]);
    expect(specPackageNamesFromDeps(byName, http)).toEqual([
      "@scope/billing-spec",
      "@scope/other-spec",
    ]);
  });
});

describe("packagesDependingOn", () => {
  it("finds packages of a kind that depend on the target", () => {
    const spec = manifest({ package_name: "@scope/billing-spec", kind: "spec" });
    const http = manifest({
      package_name: "@scope/billing-http",
      kind: "http",
      json: { dependencies: { "@scope/billing-spec": "*" } },
    });
    const otherHttp = manifest({
      package_name: "@scope/unrelated-http",
      kind: "http",
      json: { dependencies: { "@scope/other-spec": "*" } },
    });
    const sdk = manifest({
      package_name: "@scope/billing-sdk",
      kind: "sdk",
      json: { dependencies: { "@scope/billing-spec": "*" } },
    });
    expect(
      packagesDependingOn([spec, http, otherHttp, sdk], spec.package_name, "http").map(
        (m) => m.package_name,
      ),
    ).toEqual(["@scope/billing-http"]);
    expect(
      packagesDependingOn([spec, http, otherHttp, sdk], spec.package_name, "sdk").map(
        (m) => m.package_name,
      ),
    ).toEqual(["@scope/billing-sdk"]);
  });
});
