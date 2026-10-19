import type { Command } from "commander";
import { checkBoundaries } from "../../src/boundaries/check-boundaries.ts";
import {
  formatPackageDetail,
  formatProductMap,
  productMap,
} from "../../src/boundaries/package-map.ts";

interface MapOptions {
  root?: string;
  package?: string;
  depth?: string;
  json?: boolean;
}

export const addMapCommand = (program: Command) => {
  program
    .command("map")
    .description(
      "Show the product's packages by layer and feature with their dependencies; --package <name> for one package's imports, users and code by directory",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--package <name>",
      "Detail for one package (full name, name without scope, or suffix)",
    )
    .option(
      "--depth <n>",
      "Directory depth for --package's code breakdown",
      "2",
    )
    .option("--json", "Print the product map as JSON")
    .action((options: MapOptions) => {
      const { graph } = checkBoundaries({ root: options.root });
      const map = productMap(graph);
      if (options.json) {
        const packages = options.package
          ? map.packages.filter(
              (p) =>
                p.name === options.package || p.name.endsWith(options.package!),
            )
          : map.packages;
        console.log(JSON.stringify({ packages }, null, 2));
        return;
      }
      console.log(
        options.package
          ? formatPackageDetail(graph, map, options.package, {
              depth: Number(options.depth) || 2,
            })
          : formatProductMap(map),
      );
    });
};
