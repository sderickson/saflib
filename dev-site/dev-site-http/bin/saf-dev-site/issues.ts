import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { resolveRef } from "@saflib/git";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { getCommitPackage } from "../../get-package.ts";
import { collectPackageIssues } from "../../package-issues.ts";
import {
  resolveDbPath,
  resolveMainRef,
  resolveProductRoot,
  resolveRepoRoot,
} from "./defaults.ts";
import { ensureCliDbAvailable } from "./ensure-db.ts";

export const addIssuesCommand = (program: Command) => {
  program
    .command("issues")
    .description(
      "List Spec Issues for a package (dead code = exports/queries with no non-test importers). Uses the same analyzed DB + assemblers as the UI. Defaults to HEAD and the daemon HTTP sqlite when present.",
    )
    .requiredOption(
      "-p, --package <name>",
      "Package name (e.g. @pathclerk/daemon-form-artifacts)",
    )
    .argument("[hash]", "Commit hash (default: HEAD)")
    .option("--repo-root <path>", "Git repository root (default: cwd / DEV_SITE_REPO_ROOT)")
    .option(
      "--product-root <path>",
      "Path prefix within the repo (default: daemon when using daemon DB, else DEV_SITE_PRODUCT_ROOT / empty)",
    )
    .option("--main-ref <ref>", "Main branch ref (default: main / DEV_SITE_MAIN_REF)")
    .option(
      "--db <path>",
      "SQLite file path (default: DEV_SITE_DB_PATH, else daemon/.../dev-site.sqlite if present; opens read-only)",
    )
    .option("--json", "Print machine-readable JSON", false)
    .action(
      async (
        hashArg: string | undefined,
        opts: {
          package: string;
          db?: string;
          repoRoot?: string;
          productRoot?: string;
          mainRef?: string;
          json?: boolean;
        },
      ) => {
        const repoRoot = resolveRepoRoot(opts.repoRoot);
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
              console.error(`Run: npm exec -- saf-dev-site scan`);
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

          console.log(
            `# Dead code in ${detail.packageName} @ ${detail.commitHash.slice(0, 12)}`,
          );
          console.log(
            `# ${issues.length} issue(s) — exports/queries with no non-test importers`,
          );
          console.log(
            `# db=${dbPath === true ? "(library default)" : dbPath} product-root=${productRoot || "(repo root)"}`,
          );
          console.log("");
          if (!issues.length) {
            console.log("(none)");
            return;
          }
          for (const issue of issues) {
            console.log(
              `${issue.filePath}\t${issue.name}\t${issue.kindLabel}`,
            );
          }
        } finally {
          devSiteDb.disconnect(dbKey);
        }
      },
    );
};
