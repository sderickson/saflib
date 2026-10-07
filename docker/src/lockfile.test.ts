import { describe, expect, it } from "vitest";
import { stageInstallManifests } from "./docker.ts";
import { lockClosure, pruneLockfile, type Lockfile } from "./lockfile.ts";

/**
 * A two-product monorepo: `alpha/app` and `beta/app` share `lib/common`.
 * The root depends on `beta/app` (a workspace) and on `rootdep`.
 */
function monorepo(): {
  rootPackageJson: Record<string, unknown>;
  lockfile: Lockfile;
} {
  return {
    rootPackageJson: {
      name: "@x/root",
      private: true,
      workspaces: ["alpha/**", "beta/**", "lib/**"],
      scripts: { build: "x" },
      dependencies: { "@x/beta-app": "*", rootdep: "^1.0.0" },
      devDependencies: { vitest: "^3.0.0" },
      overrides: { shared: "2.0.0" },
    },
    lockfile: {
      name: "@x/root",
      lockfileVersion: 3,
      packages: {
        "": {
          name: "@x/root",
          workspaces: ["alpha/**", "beta/**", "lib/**"],
          dependencies: { "@x/beta-app": "*", rootdep: "^1.0.0" },
          devDependencies: { vitest: "^3.0.0" },
        },
        "alpha/app": {
          name: "@x/alpha-app",
          dependencies: { "@x/common": "*", "alpha-only": "^1.0.0" },
          devDependencies: { "alpha-dev": "^1.0.0" },
        },
        "beta/app": {
          name: "@x/beta-app",
          dependencies: { "@x/common": "*", "beta-only": "^1.0.0" },
        },
        "lib/common": {
          name: "@x/common",
          dependencies: { shared: "^2.0.0" },
        },
        "node_modules/@x/alpha-app": { resolved: "alpha/app", link: true },
        "node_modules/@x/beta-app": { resolved: "beta/app", link: true },
        "node_modules/@x/common": { resolved: "lib/common", link: true },
        "node_modules/alpha-only": {
          version: "1.0.0",
          dependencies: { nested: "^1.0.0" },
          optionalDependencies: { "native-darwin": "1.0.0" },
        },
        "node_modules/alpha-only/node_modules/nested": { version: "1.5.0" },
        "node_modules/nested": { version: "0.9.0" },
        "node_modules/native-darwin": { version: "1.0.0", optional: true },
        "node_modules/beta-only": { version: "1.0.0" },
        "node_modules/shared": { version: "2.0.0" },
        "node_modules/rootdep": { version: "1.0.0" },
        "node_modules/alpha-dev": { version: "1.0.0", dev: true },
        "node_modules/vitest": { version: "3.0.0", dev: true },
      },
    },
  };
}

const alphaStage = {
  imageName: "x-alpha-app",
  workspaceDirs: ["alpha/app", "lib/common"],
  imageWorkspaceNames: new Set(["@x/alpha-app", "@x/common"]),
  allWorkspaceNames: new Set(["@x/alpha-app", "@x/beta-app", "@x/common"]),
  isSaflibRoot: false,
};

describe("lockClosure", () => {
  it("follows prod deps (incl. optional) node-style, through workspace links", () => {
    const { lockfile } = monorepo();
    expect(lockClosure(lockfile.packages!, ["alpha/app"]).sort()).toEqual([
      "alpha/app",
      "lib/common",
      "node_modules/@x/common",
      "node_modules/alpha-only",
      "node_modules/alpha-only/node_modules/nested",
      "node_modules/native-darwin",
      "node_modules/shared",
    ]);
  });

  it("resolves from every ancestor dir, not just node_modules boundaries", () => {
    const packages = {
      "vendor/lib": { dependencies: { commander: "^15" } },
      "vendor/node_modules/commander": { version: "15.0.0" },
      "node_modules/commander": { version: "14.0.0" },
    };
    expect(lockClosure(packages, ["vendor/lib"])).toContain(
      "vendor/node_modules/commander",
    );
    expect(lockClosure(packages, ["vendor/lib"])).not.toContain(
      "node_modules/commander",
    );
  });
});

describe("pruneLockfile", () => {
  it("keeps only what the image's workspaces reach, plus their links", () => {
    const { lockfile } = monorepo();
    const pruned = pruneLockfile(lockfile, {
      workspaceDirs: ["alpha/app", "lib/common"],
      excludedWorkspaceNames: new Set(["@x/beta-app"]),
    });
    expect(Object.keys(pruned.packages!).sort()).toEqual([
      "",
      "alpha/app",
      "lib/common",
      "node_modules/@x/alpha-app",
      "node_modules/@x/common",
      "node_modules/alpha-only",
      "node_modules/alpha-only/node_modules/nested",
      "node_modules/native-darwin",
      "node_modules/rootdep",
      "node_modules/shared",
    ]);
    expect(pruned.packages![""]).toEqual({
      name: "@x/root",
      workspaces: ["alpha/app", "lib/common"],
      dependencies: { rootdep: "^1.0.0" },
    });
    expect(pruned.packages!["alpha/app"]).not.toHaveProperty("devDependencies");
    expect(pruned.lockfileVersion).toBe(3);
  });

  it("keeps ancestor entries of kept nested entries", () => {
    const pruned = pruneLockfile(
      {
        packages: {
          "": { workspaces: ["vendor", "vendor/lib"] },
          vendor: { name: "vendor-root" },
          "vendor/lib": { dependencies: { commander: "^15" } },
          "vendor/node_modules/commander": { version: "15.0.0" },
          "node_modules/vendor-lib": { resolved: "vendor/lib", link: true },
        },
      },
      { workspaceDirs: ["vendor/lib"], excludedWorkspaceNames: new Set() },
    );
    expect(Object.keys(pruned.packages!)).toContain("vendor");
  });

  it("doesn't mutate its input", () => {
    const { lockfile } = monorepo();
    const before = JSON.stringify(lockfile);
    pruneLockfile(lockfile, {
      workspaceDirs: ["alpha/app"],
      excludedWorkspaceNames: new Set(["@x/beta-app"]),
    });
    expect(JSON.stringify(lockfile)).toBe(before);
  });
});

describe("stageInstallManifests", () => {
  it("narrows the root manifest to the image", () => {
    const { rootPackageJson, lockfile } = monorepo();
    const { packageJson } = stageInstallManifests(
      rootPackageJson,
      lockfile,
      alphaStage,
    );
    expect(packageJson).toEqual({
      name: "@x/root--docker-x-alpha-app",
      private: true,
      workspaces: ["alpha/app", "lib/common"],
      dependencies: { rootdep: "^1.0.0" },
      overrides: { shared: "2.0.0" },
    });
  });

  it("is unaffected by another product's changes", () => {
    const base = monorepo();
    const before = stageInstallManifests(
      base.rootPackageJson,
      base.lockfile,
      alphaStage,
    );

    // Beta bumps its own dep, and a whole new product (gamma) is added.
    const changed = monorepo();
    const packages = changed.lockfile.packages!;
    packages["node_modules/beta-only"] = { version: "1.1.0" };
    packages["gamma/app"] = {
      name: "@x/gamma-app",
      dependencies: { "gamma-only": "^1.0.0" },
    };
    packages["node_modules/@x/gamma-app"] = {
      resolved: "gamma/app",
      link: true,
    };
    packages["node_modules/gamma-only"] = { version: "1.0.0" };
    (changed.rootPackageJson.workspaces as string[]).push("gamma/**");
    (packages[""].workspaces as string[]).push("gamma/**");

    const after = stageInstallManifests(
      changed.rootPackageJson,
      changed.lockfile,
      {
        ...alphaStage,
        allWorkspaceNames: new Set([
          ...alphaStage.allWorkspaceNames,
          "@x/gamma-app",
        ]),
      },
    );
    expect(after).toEqual(before);
  });

  it("changes when the image's own dependencies change", () => {
    const base = monorepo();
    const before = stageInstallManifests(
      base.rootPackageJson,
      base.lockfile,
      alphaStage,
    );
    const changed = monorepo();
    changed.lockfile.packages!["node_modules/shared"] = { version: "2.0.1" };
    expect(
      stageInstallManifests(
        changed.rootPackageJson,
        changed.lockfile,
        alphaStage,
      ),
    ).not.toEqual(before);
  });
});
