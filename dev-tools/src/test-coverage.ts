import { execSync } from "child_process";
import { buildMonorepoContext } from "../index.ts";
import { readdirSync } from "fs";

export async function genCoverage() {
  const ctx = buildMonorepoContext();

  for (const pkgName in ctx.monorepoPackageDirectories) {
    const dir = ctx.monorepoPackageDirectories[pkgName];
    const filesInDir = readdirSync(dir);
    const hasVitest = filesInDir.some((file) =>
      file.startsWith("vitest.config."),
    );
    if (hasVitest) {
      console.log(`\nGetting coverage for ${pkgName}\n`);
      execSync(`cd ${dir} && npm exec test-coverage -- -c`);
    } else {
      console.log(`-- ${pkgName} does NOT have vitest, skipping`);
    }
  }
}
