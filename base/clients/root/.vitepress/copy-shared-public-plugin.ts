import { constants } from "node:fs";
import { access, cp, lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/** Copy shared SPA public assets into the VitePress output (VitePress does not use vite.publicDir on build). */
export function copySharedPublicPlugin(publicDir: string): Plugin {
  let outDir = "";

  return {
    name: "copy-shared-public",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      if (!outDir) {
        return;
      }

      try {
        await access(publicDir, constants.R_OK);
      } catch {
        // Minimal Docker images for static-root omit base/clients/build.
        return;
      }

      for (const entry of await readdir(publicDir, { withFileTypes: true })) {
        const sourcePath = path.join(publicDir, entry.name);
        const stat = await lstat(sourcePath);
        if (stat.isSymbolicLink() || stat.isDirectory()) {
          continue;
        }
        await cp(sourcePath, path.join(outDir, entry.name));
      }
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const sharedPublicDir = path.resolve(__dirname, "../../build/public");
