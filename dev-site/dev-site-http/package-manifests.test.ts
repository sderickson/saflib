import { describe, expect, it } from "vitest";
import {
  packagesDependingOn,
  specPackageNamesFromDeps,
  type PackageManifest,
} from "./package-manifests.ts";

function manifest(
  partial: Pick<PackageManifest, "packageName" | "kind"> &
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
      packageName: "@scope/billing-spec",
      kind: "spec",
    });
    const otherSpec = manifest({
      packageName: "@scope/other-spec",
      kind: "spec",
    });
    const http = manifest({
      packageName: "@scope/billing-http",
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
      [billingSpec.packageName, billingSpec],
      [otherSpec.packageName, otherSpec],
      [http.packageName, http],
    ]);
    expect(specPackageNamesFromDeps(byName, http)).toEqual([
      "@scope/billing-spec",
      "@scope/other-spec",
    ]);
  });
});

describe("packagesDependingOn", () => {
  it("finds packages of a kind that depend on the target", () => {
    const spec = manifest({ packageName: "@scope/billing-spec", kind: "spec" });
    const http = manifest({
      packageName: "@scope/billing-http",
      kind: "http",
      json: { dependencies: { "@scope/billing-spec": "*" } },
    });
    const otherHttp = manifest({
      packageName: "@scope/unrelated-http",
      kind: "http",
      json: { dependencies: { "@scope/other-spec": "*" } },
    });
    const sdk = manifest({
      packageName: "@scope/billing-sdk",
      kind: "sdk",
      json: { dependencies: { "@scope/billing-spec": "*" } },
    });
    expect(
      packagesDependingOn([spec, http, otherHttp, sdk], spec.packageName, "http").map(
        (m) => m.packageName,
      ),
    ).toEqual(["@scope/billing-http"]);
    expect(
      packagesDependingOn([spec, http, otherHttp, sdk], spec.packageName, "sdk").map(
        (m) => m.packageName,
      ),
    ).toEqual(["@scope/billing-sdk"]);
  });
});
