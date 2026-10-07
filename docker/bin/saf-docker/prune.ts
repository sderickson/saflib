import type { Command } from "commander";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { listBuilds } from "../../src/builds.ts";
import { cleanupImages } from "../../src/cleanup.ts";
import { dockerCli } from "../../src/executor.ts";
import { DEFAULT_KEEP_IMAGES } from "../../src/run-build.ts";

export const addPruneCommand = (program: Command) => {
  program
    .command("prune")
    .description(
      "Free disk space: untag older input-tagged versions of every build's images, remove dangling images, and trim the build cache (kept warm, up to a size cap).",
    )
    .option(
      "--keep <n>",
      "input-tagged versions to keep per image and architecture",
      String(DEFAULT_KEEP_IMAGES),
    )
    .option("--max-cache <size>", "build cache size to trim down to", "20gb")
    .action(async (options: { keep: string; maxCache: string }) => {
      const builds = listBuilds(buildMonorepoContext());
      const { removed, skipped } = await cleanupImages(
        dockerCli,
        builds.map((b) => b.image),
        Number(options.keep),
      );
      console.log(
        `Removed ${removed.length} old image tag(s), keeping the newest ${options.keep} per image and architecture` +
          (skipped.length ? ` (${skipped.length} in use, left alone)` : ""),
      );
      await dockerCli.pruneBuildCache(options.maxCache);
      console.log(`Build cache trimmed to at most ${options.maxCache}.`);
    });
};
