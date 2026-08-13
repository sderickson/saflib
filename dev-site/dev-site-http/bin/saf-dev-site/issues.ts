import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { resolveRef } from "@saflib/git";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { getCommitPackage } from "../../get-package.ts";
import { collectPackageIssues } from "../../package-issues.ts";

export const addIssuesCommand = (program: Command) => {
  program
    .command("issues")
    .description(
      "List Spec Issues for a package (dead code = exports/queries with no non-test importers). Uses the same analyzed DB + assemblers as the UI.",
    )
    .requiredOption(
      "-p, --package <name>",
      "Package name (e.g. @pathclerk/daemon-form-artifacts)",
    )
    .argument(
      "[hash]",
      "Commit hash (default: HEAD)",
    )
    .option(
      "--repo-root <path>",
      "Git repository root",
      process.cwd(),
    )
    .option(
      "--product-root <path>",
      "Path prefix within the repo (e.g. daemon)",
      "",
    )
    .option("--main-ref <ref>", "Main branch ref", "main")
    .option(
      "--db <path>",
      "SQLite file path. Defaults to an on-disk file under @saflib/dev-site-db/data/.",
    )
    .option("--json", "Print machine-readable JSON", false)
    .action(
      async (
        hashArg: string | undefined,
        opts: {
          package: string;
          db?: string;
          repoRoot: string;
          productRoot: string;
          mainRef: string;
          json?: boolean;
        },
      ) => {
        const dbKey = devSiteDb.connect({
          onDisk: opts.db ?? true,
        });
        try {
          let hash = hashArg;
          if (!hash) {
            const head = resolveRef(opts.repoRoot, "HEAD");
            if (head.error) throw head.error;
            hash = head.result;
          }

          const detail = await throwError(
            getCommitPackage(dbKey, hash, opts.package, {
              repoRoot: opts.repoRoot,
              productRoot: opts.productRoot || undefined,
              mainRef: opts.mainRef,
            }),
          );

          const issues = collectPackageIssues(detail, {
            packageDirectory: detail.directory,
            productRoot: opts.productRoot || undefined,
          });

          if (opts.json) {
            console.log(
              JSON.stringify(
                {
                  commitHash: detail.commitHash,
                  packageName: detail.packageName,
                  directory: detail.directory,
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
            `# (same rules as Spec → Issues in the dev-site UI)`,
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
