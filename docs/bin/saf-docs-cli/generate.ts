import {
  type MonorepoContext,
  getCurrentPackageName,
} from "@saflib/monorepo/workspace";
import { generateTypeDoc } from "./generate-typedoc.ts";
import { isVuePackage } from "./generate-typedoc-vue.ts";
import {
  generateVueComponentDocs,
  patchVueRefIndex,
} from "./generate-vue-components.ts";
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
  const packageDir = monorepoContext.monorepoPackageDirectories[targetPackage];
  const packageJson = monorepoContext.monorepoPackageJsons[targetPackage];
  const vuePackage = isVuePackage(packageDir, packageJson);

  generateTypeDoc({ monorepoContext, packageName: targetPackage });

  if (vuePackage) {
    generateVueComponentDocs({ packageDir, packageJson });
    patchVueRefIndex(packageDir);
  }
  generateCliDocs({ monorepoContext, packageName: targetPackage });
  generateEnvDocs({ monorepoContext, packageName: targetPackage });
  generateWorkflowDocs({ monorepoContext, packageName: targetPackage });

  console.log(`Formatting docs for ${targetPackage}`);
  formatPath(path.join(packageDir, "docs"));
};
