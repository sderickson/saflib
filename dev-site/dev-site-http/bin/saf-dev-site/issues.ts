import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { resolveRef } from "@saflib/git";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { getCommitPackage } from "../../get-package.ts";
import { collectPackageIssues } from "../../package-issues.ts";
import { collectWorkdirPackageIssues } from "../../workdir-package-issues.ts";
import {
  resolveDbPath,
  resolveMainRef,
  resolveProductRoot,
  resolveRepoRoot,
  resolveWorkdirProductRoot,
} from "./defaults.ts";
import { ensureCliDbAvailable } from "./ensure-db.ts";

function printIssuesText(args: {
  packageName: string;
  label: string;
  productRoot: string;
  metaLine: string;
  issues: Array<{
    filePath: string;
    name: string;
    kindLabel: string;
    kind?: string;
  }>;
}): void {
  console.log(`# Issues in ${args.packageName} @ ${args.label}`);
  console.log(`# ${args.issues.length} issue(s)`);
  console.log(args.metaLine);
  console.log(
    "# triage: saflib/dev-tools/docs/package-issues.md",
  );
  console.log("");
  if (!args.issues.length) {
    console.log("(none)");
    return;
  }
  for (const issue of args.issues) {
    const kind = issue.kind ? `${issue.kind}\t` : "";
    console.log(
      `${kind}${issue.filePath}\t${issue.name}\t${issue.kindLabel}`,
    );
  }
}

export const addIssuesCommand = (program: Command) => {
  program
    .command("issues")
    .description(
      "List Spec Issues for a package (dead code = exports with no non-test importers). Default: analyzed DB at HEAD. Pass --workdir to scan the live tree (no DB / commit).",
    )
    .requiredOption(
      "-p, --package <name>",
      "Package name (e.g. @acme/form-artifacts)",
    )
    .argument("[hash]", "Commit hash (default: HEAD; ignored with --workdir)")
    .option("--workdir", "Analyze the working tree (no sqlite / no scan)", false)
    .option("--repo-root <path>", "Git repository root (default: cwd / DEV_SITE_REPO_ROOT)")
    .option(
      "--product-root <path>",
      "Path prefix within the repo (default: DEV_SITE_PRODUCT_ROOT or whole repo)",
    )
    .option("--main-ref <ref>", "Main branch ref (default: main / DEV_SITE_MAIN_REF)")
    .option(
      "--db <path>",
      "SQLite file path (default: DEV_SITE_DB_PATH or library default; opens read-only; ignored with --workdir)",
    )
    .option("--json", "Print machine-readable JSON", false)
    .action(
      async (
        hashArg: string | undefined,
        opts: {
          package: string;
          workdir?: boolean;
          db?: string;
          repoRoot?: string;
          productRoot?: string;
          mainRef?: string;
          json?: boolean;
        },
      ) => {
        const repoRoot = resolveRepoRoot(opts.repoRoot);

        if (opts.workdir) {
          const dbPath = resolveDbPath(repoRoot, opts.db);
          const productRoot = resolveWorkdirProductRoot(
            repoRoot,
            opts.productRoot,
            dbPath,
          );
          const result = await collectWorkdirPackageIssues({
            repoRoot,
            productRoot: productRoot || undefined,
            packageName: opts.package,
          });

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          printIssuesText({
            packageName: result.packageName,
            label: "workdir",
            productRoot: result.productRoot,
            metaLine: `# source=workdir product-root=${result.productRoot || "(repo root)"} exports=${result.exportCount}`,
            issues: result.issues,
          });
          return;
        }

        const dbPath = resolveDbPath(repoRoot, opts.db);
        ensureCliDbAvailable(dbPath, "read");
        const productRoot = resolveProductRoot(opts.productRoot, dbPath);
        const mainRef = resolveMainRef(opts.mainRef);

        const dbKey = devSiteDb.connect({
          onDisk: dbPath,
          readonly: true,
          skipMigrations: true,
        });
        try {
          const ref = hashArg || "HEAD";
          const resolved = resolveRef(repoRoot, ref);
          if (resolved.error) throw resolved.error;
          const hash = resolved.result;

          let detail;
          try {
            detail = await throwError(
              getCommitPackage(dbKey, hash, opts.package, {
                repoRoot,
                productRoot: productRoot || undefined,
                mainRef,
              }),
            );
          } catch (err) {
            const cause =
              err instanceof Error && "cause" in err
                ? (err as Error & { cause?: unknown }).cause
                : err;
            if (cause instanceof AnalyzedCommitNotFoundError) {
              console.error(
                `Commit ${hash.slice(0, 12)} (${ref}) is not analyzed in the dev-site DB.`,
              );
              console.error(
                `Run a UI/DB scan, or use --workdir to analyze the live tree without the DB.`,
              );
              process.exitCode = 1;
              return;
            }
            throw err;
          }

          const issues = collectPackageIssues(detail, {
            packageDirectory: detail.directory,
            productRoot: productRoot || undefined,
          });

          if (opts.json) {
            console.log(
              JSON.stringify(
                {
                  commitHash: detail.commitHash,
                  packageName: detail.packageName,
                  directory: detail.directory,
                  source: "db",
                  dbPath: dbPath === true ? "(library default)" : dbPath,
                  productRoot,
                  issueCount: issues.length,
                  issues,
                },
                null,
                2,
              ),
            );
            return;
          }

          printIssuesText({
            packageName: detail.packageName,
            label: detail.commitHash.slice(0, 12),
            productRoot,
            metaLine: `# db=${dbPath === true ? "(library default)" : dbPath} product-root=${productRoot || "(repo root)"}`,
            issues,
          });
        } finally {
          devSiteDb.disconnect(dbKey);
        }
      },
    );
};
