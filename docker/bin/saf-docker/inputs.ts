import type { Command } from "commander";
import path from "node:path";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { generateDockerfiles } from "../../src/docker.ts";
import { findBuild, listBuilds, type Build } from "../../src/builds.ts";
import {
  computeBuildInputs,
  inputTag,
  type BuildInputs,
} from "../../src/inputs.ts";

export function resolveBuilds(all: Build[], identifiers: string[]): Build[] {
  if (identifiers.length === 0) return all;
  return identifiers.map((id) => {
    const build = findBuild(all, id);
    if (!build) {
      throw new Error(
        `Unknown build "${id}". Known builds:\n  ${all.map((b) => b.ref).join("\n  ")}`,
      );
    }
    return build;
  });
}

function printInputs(result: BuildInputs, verbose: boolean): void {
  const { build } = result;
  console.log(
    `${build.ref}\n  image: ${build.image}:${inputTag(result.inputHash)}${result.dirty ? "  (dirty)" : ""}`,
  );
  if (verbose) {
    for (const input of result.inputs) {
      console.log(
        `    ${input.kind.padEnd(8)} ${input.hash.slice(0, 12)}  ${input.key || "."}`,
      );
    }
  }
  if (result.externalImages.length > 0) {
    console.log(`  external images: ${result.externalImages.join(", ")}`);
  }
  if (result.gitInvisibleContextFiles.length > 0) {
    const shown = verbose
      ? result.gitInvisibleContextFiles
      : result.gitInvisibleContextFiles.slice(0, 5);
    console.log(
      `  warning: ${result.gitInvisibleContextFiles.length} gitignored path(s) reach the build context but not the input hash:`,
    );
    for (const file of shown) console.log(`    ${file}`);
    if (shown.length < result.gitInvisibleContextFiles.length) {
      console.log(`    … (--verbose to list all)`);
    }
  }
}

export const addInputsCommand = (program: Command) => {
  program
    .command("inputs")
    .description(
      "Print each build's inputs and input hash (the image tag it would get). Accepts build refs (@pkg/builds/<name>) or package names; defaults to all builds.",
    )
    .argument("[builds...]", "build refs or package names")
    .option(
      "--platform <platform>",
      "target platform, e.g. linux/amd64",
      "native",
    )
    .option("--json", "print machine-readable output")
    .option("-v, --verbose", "list every input")
    .option("--no-generate", "use the Dockerfiles already on disk")
    .action(
      (
        identifiers: string[],
        options: {
          platform: string;
          json?: boolean;
          verbose?: boolean;
          generate: boolean;
        },
      ) => {
        const ctx = buildMonorepoContext();
        if (options.generate) generateDockerfiles(ctx);
        const all = listBuilds(ctx);
        const builds = resolveBuilds(all, identifiers);
        const memo = new Map<string, BuildInputs>();
        const results = builds.map((build) =>
          computeBuildInputs(
            build,
            {
              contextDir: ctx.rootDir,
              builds: all,
              platform: options.platform,
            },
            memo,
          ),
        );
        if (options.json) {
          console.log(
            JSON.stringify(
              results.map((r) => ({
                ...r,
                build: {
                  ...r.build,
                  dir: path.relative(ctx.rootDir, r.build.dir),
                },
                dockerfilePath: undefined,
                tag: inputTag(r.inputHash),
              })),
              null,
              2,
            ),
          );
          return;
        }
        for (const result of results) printInputs(result, !!options.verbose);
      },
    );
};
