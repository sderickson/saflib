import type { MonorepoContext } from "@saflib/monorepo/workspace";
import { relative } from "node:path";
import { cleanupEmittedDeclarationArtifacts } from "./generate-typedoc-vue.ts";

export function cleanupAllDeclarationArtifacts(
  monorepoContext: MonorepoContext,
): void {
  const packageNames = Array.from(monorepoContext.packages).sort();
  let cleanedPackages = 0;
  let removedArtifacts = 0;

  for (const packageName of packageNames) {
    const packageDir = monorepoContext.monorepoPackageDirectories[packageName];
    const removed = cleanupEmittedDeclarationArtifacts(packageDir);
    if (!removed) {
      continue;
    }

    cleanedPackages += 1;
    removedArtifacts += removed;
    console.log(
      `- ${packageName}: removed ${removed} artifact(s) under ${relative(monorepoContext.rootDir, packageDir)}`,
    );
  }

  if (!cleanedPackages) {
    console.log("No emitted declaration artifacts found.");
    return;
  }

  console.log(
    `\nCleaned ${removedArtifacts} artifact(s) across ${cleanedPackages} package(s). Hand-written ambient .d.ts files were preserved.`,
  );
}
