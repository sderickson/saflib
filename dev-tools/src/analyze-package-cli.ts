#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Umbrella static-analysis CLI: package layout/LoC + exports + graph issues.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import {
  assembleUsedBy,
  buildFileSpecialty,
  buildPackageIndex,
  checkExports,
  collectPackageIssues,
  exportUsedByKey,
  findMonorepoRoot,
  resolvePackageDir,
  type FileSpecialty,
  type PackageIssue,
  type UsedByImporterUnit,
} from "@saflib/imports";
import { checkPackageLayout } from "@saflib/monorepo";

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "docs",
  "fixtures",
]);

async function walkFiles(absDir: string, relDir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (EXCLUDE_DIRS.has(e.name)) continue;
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    const abs = path.join(absDir, e.name);
    if (e.isDirectory()) out.push(...(await walkFiles(abs, rel)));
    else if (e.isFile()) out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}

function isAnalyzableTs(rel: string): boolean {
  return (
    (rel.endsWith(".ts") || rel.endsWith(".tsx")) && !rel.endsWith(".d.ts")
  );
}

function isTestPath(rel: string): boolean {
  const base = rel.split("/").pop() ?? rel;
  if (/\.(test|spec)\.(ts|tsx)$/.test(base)) return true;
  const parts = rel.split("/");
  return parts.includes("tests") || parts.includes("__tests__");
}

function packageForRepoPath(
  repoPath: string,
  roots: Array<{ packageName: string; directory: string }>,
): { packageName: string; directory: string } {
  let best: { packageName: string; directory: string } | null = null;
  for (const r of roots) {
    const d = r.directory;
    if (!d) {
      if (!best) best = r;
      continue;
    }
    if (repoPath === d || repoPath.startsWith(`${d}/`)) {
      if (!best || d.length >= best.directory.length) best = r;
    }
  }
  return best ?? { packageName: "(unknown)", directory: "" };
}

async function analyzeOnePackage(opts: {
  packageName: string;
  packageDir: string;
  packageRepoPath: string;
  monorepoRoot: string;
  productRoot: string;
}): Promise<PackageIssue[]> {
  const issues: PackageIssue[] = [];

  for (const i of checkPackageLayout({
    packageDir: opts.packageDir,
    packageRepoPath: opts.packageRepoPath,
  })) {
    issues.push({ ...i });
  }

  const exportsCheck = checkExports(opts.packageDir);
  if (!exportsCheck.ok) {
    for (const d of exportsCheck.diffs) {
      issues.push({
        kind: "package-layout",
        title: "Exports",
        name: d,
        kindLabel: "exports",
        filePath: "package.json",
        repoPath: opts.packageRepoPath
          ? `${opts.packageRepoPath}/package.json`
          : "package.json",
      });
    }
  }

  const index = buildPackageIndex(opts.monorepoRoot);
  const roots = [...index.entries()].map(([packageName, info]) => ({
    packageName,
    directory: path
      .relative(opts.monorepoRoot, info.dir)
      .split(path.sep)
      .join("/"),
  }));

  const walkRoot = opts.productRoot
    ? path.join(opts.monorepoRoot, opts.productRoot)
    : opts.monorepoRoot;
  const allFiles = await walkFiles(walkRoot, opts.productRoot || "");
  const specialtyByPath = new Map<string, FileSpecialty>();
  for (const rel of allFiles) {
    if (!isAnalyzableTs(rel)) continue;
    const text = await readFile(path.join(opts.monorepoRoot, rel), "utf8");
    specialtyByPath.set(rel, buildFileSpecialty(text));
  }

  const underPkg = (rel: string) => {
    const d = opts.packageRepoPath;
    if (!d) return true;
    return rel === d || rel.startsWith(`${d}/`);
  };

  const exports: Array<{ filePath: string; name: string; kind: string }> = [];
  for (const [rel, specialty] of specialtyByPath) {
    if (!underPkg(rel) || isTestPath(rel)) continue;
    for (const exp of specialty.exports) {
      exports.push({ filePath: rel, name: exp.name, kind: exp.kind });
    }
  }

  const importers: UsedByImporterUnit[] = [];
  for (const [rel, specialty] of specialtyByPath) {
    const root = packageForRepoPath(rel, roots);
    importers.push({
      path: rel,
      packageName: root.packageName,
      packageDirectory: root.directory,
      isTest: isTestPath(rel),
      imports: specialty.imports,
    });
  }

  const usedBy = assembleUsedBy(
    opts.packageName,
    opts.packageRepoPath,
    exports,
    importers,
  );

  issues.push(
    ...collectPackageIssues(
      {
        packageName: opts.packageName,
        directory: opts.packageRepoPath,
        exports: exports.map((e) => ({
          name: e.name,
          kind: e.kind,
          filePath: e.filePath,
          usedBy: usedBy.get(exportUsedByKey(e.filePath, e.name)) ?? [],
        })),
      },
      { packageDirectory: opts.packageRepoPath },
    ),
  );

  return issues.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
  );
}

const program = new Command()
  .name("analyze-package")
  .description(
    "Run package layout, LoC, exports, and dead-code / same-file-only checks",
  )
  .requiredOption("--package <name>", "Workspace package name")
  .option("--root <dir>", "Monorepo root (default: auto-detect)")
  .option(
    "--product-root <dir>",
    "Limit source walk to this repo-relative prefix (e.g. daemon)",
  )
  .option(
    "--workdir",
    "Analyze the working tree (default behavior; accepted for symmetry with saf-dev-site)",
  )
  .action(
    async (options: {
      package: string;
      root?: string;
      productRoot?: string;
    }) => {
      const monorepoRoot = options.root
        ? path.resolve(options.root)
        : findMonorepoRoot(process.cwd());
      const { dir, error } = resolvePackageDir(options.package, monorepoRoot);
      if (error) {
        console.error(error);
        process.exitCode = 1;
        return;
      }
      const packageRepoPath = path
        .relative(monorepoRoot, dir)
        .split(path.sep)
        .join("/");
      const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

      const issues = await analyzeOnePackage({
        packageName: options.package,
        packageDir: dir,
        packageRepoPath,
        monorepoRoot,
        productRoot,
      });

      if (issues.length === 0) {
        console.log(`OK: ${options.package} — no architecture issues`);
        return;
      }

      console.error(`${issues.length} issue(s) for ${options.package}:\n`);
      for (const i of issues) {
        console.error(`  [${i.kind}] ${i.filePath}: ${i.name}`);
      }
      process.exitCode = 1;
    },
  );

setupContext({ serviceName: "analyze-package" }, () => {
  program.parse(process.argv);
});
