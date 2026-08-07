import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildReferenceGraph,
  checkReferences,
  detectReferenceCycles,
  generateReferences,
  isInternalReference,
  mergePackageReferences,
  MONOLITH_PACKAGE_NAME,
  previewReferencesGenerate,
  resolveTsconfigEntry,
} from "./index.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");
const pkgA = path.join(fixtureRoot, "packages/pkg-a");
const pkgB = path.join(fixtureRoot, "packages/pkg-b");
const pkgC = path.join(fixtureRoot, "packages/pkg-c");
const vueApp = path.join(fixtureRoot, "packages/vue-app");

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempMonorepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "saf-refs-"));
  tempDirs.push(root);

  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({ name: "tmp-monorepo", lockfileVersion: 3 }, null, 2),
  );
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "tmp-monorepo",
        private: true,
        workspaces: ["packages/*", "saflib/*"],
      },
      null,
      2,
    ),
  );

  const writePkg = (
    relDir: string,
    name: string,
    deps: Record<string, string> = {},
    opts: { vueSplit?: boolean; references?: { path: string }[] } = {},
  ) => {
    const dir = path.join(root, relDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name,
          private: true,
          type: "module",
          dependencies: deps,
        },
        null,
        2,
      ),
    );
    if (opts.vueSplit) {
      fs.writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify(
          {
            files: [],
            references: opts.references ?? [
              { path: "./tsconfig.app.json" },
              { path: "./tsconfig.node.json" },
            ],
          },
          null,
          2,
        ),
      );
      fs.writeFileSync(
        path.join(dir, "tsconfig.app.json"),
        JSON.stringify({ include: ["**/*.ts"] }, null, 2),
      );
      fs.writeFileSync(
        path.join(dir, "tsconfig.node.json"),
        JSON.stringify({ include: ["vite.config.ts"] }, null, 2),
      );
    } else {
      fs.writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: { composite: true },
            include: ["**/*.ts"],
            ...(opts.references ? { references: opts.references } : {}),
          },
          null,
          2,
        ),
      );
    }
    fs.writeFileSync(path.join(dir, "index.ts"), "export {};\n");
  };

  writePkg("packages/leaf-a", "@tmp/leaf-a");
  writePkg("packages/leaf-b", "@tmp/leaf-b", { "@tmp/leaf-a": "*" });
  writePkg(
    "packages/vue-app",
    "@tmp/vue-app",
    { "@tmp/leaf-a": "*" },
    { vueSplit: true },
  );
  writePkg("saflib/core", "@tmp/saflib-core");
  fs.writeFileSync(
    path.join(root, "saflib/package.json"),
    JSON.stringify(
      { name: "@saflib/saflib", private: true, workspaces: ["*"] },
      null,
      2,
    ),
  );

  return root;
}

describe("resolveTsconfigEntry", () => {
  it("returns tsconfig.json when present", () => {
    expect(resolveTsconfigEntry(pkgA)).toBe("tsconfig.json");
  });

  it("returns package-root tsconfig for Vue split packages", () => {
    expect(resolveTsconfigEntry(vueApp)).toBe("tsconfig.json");
  });

  it("returns null when missing", () => {
    expect(resolveTsconfigEntry(pkgC)).toBeNull();
  });
});

describe("buildReferenceGraph", () => {
  it("includes deps and devDeps edges among typecheckable packages", () => {
    const { graph, missingTsconfig, skippedMeta } =
      buildReferenceGraph(fixtureRoot);

    expect(skippedMeta).toContain("mini-monorepo");
    expect(missingTsconfig).toEqual(["@fixture/pkg-c"]);

    expect(graph.has("@fixture/pkg-a")).toBe(true);
    expect(graph.has("@fixture/pkg-b")).toBe(true);
    expect(graph.has("@fixture/vue-app")).toBe(true);
    expect(graph.has("@fixture/pkg-c")).toBe(false);

    expect(graph.get("@fixture/pkg-a")!.references).toEqual([
      "@fixture/pkg-b",
    ]);

    expect(graph.get("@fixture/pkg-b")!.references).toEqual([
      "@fixture/pkg-a",
    ]);

    expect(graph.get("@fixture/vue-app")!.references).toEqual([
      "@fixture/pkg-a",
      "@fixture/pkg-b",
    ]);
  });
});

describe("detectReferenceCycles", () => {
  it("finds the pkg-a ↔ pkg-b cycle", () => {
    const { graph } = buildReferenceGraph(fixtureRoot);
    const cycles = detectReferenceCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual([
      "@fixture/pkg-a",
      "@fixture/pkg-b",
      "@fixture/pkg-a",
    ]);
  });
});

describe("mergePackageReferences", () => {
  it("preserves internal Vue leaf refs and sorts workspace refs", () => {
    const merged = mergePackageReferences(
      vueApp,
      [
        { path: "./tsconfig.node.json" },
        { path: "./tsconfig.app.json" },
        { path: "../pkg-a" },
      ],
      [{ path: "../pkg-b" }, { path: "../pkg-a" }],
    );
    // localeCompare: `../` sorts before `./`
    expect(merged).toEqual([
      { path: "../pkg-a" },
      { path: "../pkg-b" },
      { path: "./tsconfig.app.json" },
      { path: "./tsconfig.node.json" },
    ]);
    expect(isInternalReference(vueApp, "./tsconfig.app.json")).toBe(true);
    expect(isInternalReference(vueApp, "../pkg-a")).toBe(false);
  });
});

describe("previewReferencesGenerate", () => {
  it("emits relative reference paths and marks write supported", () => {
    const preview = previewReferencesGenerate({
      root: fixtureRoot,
      write: false,
    });

    expect(preview.write).toBe(false);
    expect(preview.writeSupported).toBe(true);
    expect(preview.missingTsconfig).toEqual(["@fixture/pkg-c"]);
    expect(preview.solutions).toHaveLength(1);
    expect(preview.solutions[0]!.kind).toBe("generic-root");

    const a = preview.packages.find((p) => p.package === "@fixture/pkg-a");
    expect(a).toBeDefined();
    expect(a!.references).toEqual([{ path: "../pkg-b" }]);

    const vue = preview.packages.find((p) => p.package === "@fixture/vue-app");
    expect(vue!.references.map((r) => r.path).sort()).toEqual([
      "../pkg-a",
      "../pkg-b",
    ]);
  });
});

describe("generateReferences --write", () => {
  it("writes package + nested solutions and is idempotent", () => {
    const root = makeTempMonorepo();

    const first = generateReferences({ root, write: true });
    expect(first.written.length).toBeGreaterThan(0);

    const vueTsconfig = path.join(root, "packages/vue-app/tsconfig.json");
    const vueConfig = JSON.parse(fs.readFileSync(vueTsconfig, "utf8")) as {
      references: { path: string }[];
    };
    expect(vueConfig.references.map((r) => r.path)).toEqual([
      "../leaf-a",
      "./tsconfig.app.json",
      "./tsconfig.node.json",
    ]);

    const pathclerkRoot = JSON.parse(
      fs.readFileSync(path.join(root, "tsconfig.json"), "utf8"),
    ) as { files: string[]; references: { path: string }[] };
    expect(pathclerkRoot.files).toEqual([]);
    expect(pathclerkRoot.references.map((r) => r.path)).toContain("./saflib");
    expect(pathclerkRoot.references.map((r) => r.path)).toContain(
      "./packages/leaf-a",
    );
    expect(pathclerkRoot.references.map((r) => r.path)).not.toContain(
      "./saflib/core",
    );

    const saflibRoot = JSON.parse(
      fs.readFileSync(path.join(root, "saflib/tsconfig.json"), "utf8"),
    ) as { references: { path: string }[] };
    expect(saflibRoot.references.map((r) => r.path)).toEqual(["./core"]);

    const second = generateReferences({ root, write: true });
    expect(second.written).toEqual([]);
    expect(second.unchanged.length).toBeGreaterThan(0);

    const check = checkReferences({ root });
    expect(check.ok).toBe(true);
    expect(check.cycles).toEqual([]);
    expect(check.drifts).toEqual([]);
  });

  it("check fails on drift", () => {
    const root = makeTempMonorepo();
    generateReferences({ root, write: true });

    const leafB = path.join(root, "packages/leaf-b/tsconfig.json");
    const config = JSON.parse(fs.readFileSync(leafB, "utf8")) as {
      references: { path: string }[];
    };
    config.references = [];
    fs.writeFileSync(leafB, `${JSON.stringify(config, null, 2)}\n`);

    const check = checkReferences({ root });
    expect(check.ok).toBe(false);
    expect(check.drifts.some((d) => d.tsconfig === leafB)).toBe(true);
  });
});

describe("monolith special-case", () => {
  it("unions all daemon/service packages into monolith references", () => {
    const root = makeTempMonorepo();
    const service = path.join(root, "daemon/service");
    for (const [rel, name] of [
      ["monolith", MONOLITH_PACKAGE_NAME],
      ["http", "@tmp/daemon-http"],
      ["integrations/x", "@tmp/daemon-x"],
    ] as const) {
      const dir = path.join(service, rel);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify(
          {
            name,
            private: true,
            type: "module",
            dependencies:
              name === MONOLITH_PACKAGE_NAME
                ? { "@tmp/daemon-http": "*" }
                : {},
          },
          null,
          2,
        ),
      );
      fs.writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { composite: true } }, null, 2),
      );
    }

    // Expand workspaces so buildMonorepoContext discovers daemon packages.
    const rootPj = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { workspaces: string[] };
    rootPj.workspaces = ["packages/*", "saflib/*", "daemon/service/**"];
    fs.writeFileSync(
      path.join(root, "package.json"),
      `${JSON.stringify(rootPj, null, 2)}\n`,
    );

    const { graph } = buildReferenceGraph(root);
    const mono = graph.get(MONOLITH_PACKAGE_NAME);
    expect(mono).toBeDefined();
    expect(mono!.references.sort()).toEqual([
      "@tmp/daemon-http",
      "@tmp/daemon-x",
    ]);
  });
});
