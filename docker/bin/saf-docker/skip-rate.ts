import type { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import path from "node:path";
import { generateDockerfiles, isSaflibMonorepoRoot } from "../../src/docker.ts";
import { listBuilds } from "../../src/builds.ts";
import { computeBuildInputs, type BuildInputs } from "../../src/inputs.ts";
import { measureSkipRate } from "../../src/skip-rate.ts";
import { resolveBuilds } from "./inputs.ts";

const pct = (n: number, d: number) =>
  d === 0 ? "-" : `${Math.round((100 * n) / d)}%`;

export const addSkipRateCommand = (program: Command) => {
  program
    .command("skip-rate")
    .description(
      "Estimate from git history how often each build would be skipped if images were only rebuilt when their inputs change.",
    )
    .argument("[builds...]", "build refs or package names (default: all)")
    .option("-n, --commits <n>", "number of commits to compare", "100")
    .option("--rev <rev>", "ref to walk back from (first-parent)", "HEAD")
    .option("--json", "print machine-readable output")
    .option("--no-generate", "use the Dockerfiles already on disk")
    .action(
      (
        identifiers: string[],
        options: {
          commits: string;
          rev: string;
          json?: boolean;
          generate: boolean;
        },
      ) => {
        const ctx = buildMonorepoContext();
        if (options.generate) generateDockerfiles(ctx);
        // Without generating, builds whose Dockerfile was never generated
        // (unused templates) can't be measured.
        const all = listBuilds(ctx).filter(
          (b) => options.generate || existsSync(b.dockerfilePath),
        );
        const memo = new Map<string, BuildInputs>();
        const compute = (b: (typeof all)[number]) =>
          computeBuildInputs(
            b,
            { contextDir: ctx.rootDir, builds: all, skipAudit: true },
            memo,
          );
        const skipped: string[] = [];
        const allResults = all.flatMap((b) => {
          try {
            return [compute(b)];
          } catch (e) {
            skipped.push(
              `${b.ref}: ${e instanceof Error ? e.message : String(e)}`,
            );
            return [];
          }
        });
        const resolvable = new Set(allResults.map((r) => r.build.ref));
        const selected = resolveBuilds(all, identifiers)
          .filter((b) => identifiers.length > 0 || resolvable.has(b.ref))
          .map(compute);
        const workspaces = new Map(
          Object.entries(ctx.monorepoPackageDirectories).map(([name, dir]) => [
            path.relative(ctx.rootDir, dir).split(path.sep).join("/"),
            name,
          ]),
        );
        const report = measureSkipRate(selected, allResults, {
          contextDir: ctx.rootDir,
          commits: Number(options.commits),
          rev: options.rev,
          workspaces,
          isSaflibRoot: isSaflibMonorepoRoot(
            ctx.rootDir,
            readRootName(ctx.rootDir),
          ),
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        const { compared } = report;
        console.log(
          `Compared ${compared} commit(s) on ${report.rev} (first-parent), ${report.oldest?.authoredAt.slice(0, 10)} → ${report.newest?.authoredAt.slice(0, 10)}\n`,
        );
        const width = Math.max(...report.builds.map((b) => b.ref.length), 5);
        console.log(
          `${"build".padEnd(width)}  rebuilds  skipped  lockfile-only  skipped w/o pruning  skipped w/ no lock churn`,
        );
        let totalRebuilds = 0;
        let totalUnpruned = 0;
        for (const b of report.builds) {
          totalRebuilds += b.rebuilds;
          totalUnpruned += b.rebuildsWithoutPruning;
          console.log(
            `${b.ref.padEnd(width)}  ${String(b.rebuilds).padStart(8)}  ${pct(compared - b.rebuilds, compared).padStart(7)}  ${String(b.lockfileOnlyRebuilds).padStart(13)}  ${pct(compared - b.rebuildsWithoutPruning, compared).padStart(19)}  ${pct(compared - b.sourceOnlyRebuilds, compared).padStart(24)}`,
          );
        }
        const totalBuilds = compared * report.builds.length;
        console.log(
          `\nImage builds: ${totalRebuilds} of ${totalBuilds} (${pct(totalBuilds - totalRebuilds, totalBuilds)} skipped; ${pct(totalBuilds - totalUnpruned, totalBuilds)} without lockfile pruning). Commits with no rebuild at all: ${compared - report.commitsWithAnyRebuild}/${compared}.`,
        );
        if (report.unknownSubmoduleCommits.length > 0) {
          console.log(
            `  note: ${report.unknownSubmoduleCommits.length} submodule commit(s) not in the local clone (counted as changes); fetch the submodule for accuracy`,
          );
        }
        for (const reason of skipped) console.log(`  skipped: ${reason}`);
        const unapproximated = report.builds.filter(
          (b) => b.unapproximated.length > 0,
        );
        for (const b of unapproximated) {
          console.log(
            `  note: ${b.ref} ignores untracked inputs: ${b.unapproximated.join(", ")}`,
          );
        }
      },
    );
};

function readRootName(rootDir: string): unknown {
  return (
    JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8")) as {
      name?: unknown;
    }
  ).name;
}
