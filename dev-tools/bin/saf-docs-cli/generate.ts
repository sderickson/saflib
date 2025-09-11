import { type MonorepoContext, getCurrentPackageName } from "@saflib/dev-tools";
import { generateTypeDoc } from "./generate-typedoc.ts";
import { generateCliDocs } from "./generate-cli.ts";
import { generateEnvDocs } from "./generate-env.ts";
import { generateWorkflowDocs } from "./generate-workflows.ts";
import { formatPath } from "@saflib/monorepo/dev";
import path from "node:path";

export interface GenerateOptions {
  monorepoContext: MonorepoContext;
  packageName?: string;
}

export const generateCommand = (options: GenerateOptions) => {
  const { monorepoContext, packageName } = options;
  const targetPackage = packageName || getCurrentPackageName();

  generateTypeDoc({ monorepoContext, packageName: targetPackage });
  generateCliDocs({ monorepoContext, packageName: targetPackage });
  generateEnvDocs({ monorepoContext, packageName: targetPackage });
  generateWorkflowDocs({ monorepoContext, packageName: targetPackage });

  const packageDir = monorepoContext.monorepoPackageDirectories[targetPackage];

  console.log(`Formatting docs for ${targetPackage}`);
  formatPath(path.join(packageDir, "docs"));
};
