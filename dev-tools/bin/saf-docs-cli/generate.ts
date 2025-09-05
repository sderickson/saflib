import { type MonorepoContext } from "@saflib/dev-tools";
import { generateTypeDoc } from "./generate-typedoc.ts";
import { generateCliDocs } from "./generate-cli.ts";
import { generateEnvDocs } from "./generate-env.ts";
import { generateWorkflowDocs } from "./generate-workflows.ts";

export const generateCommand = (monorepoContext: MonorepoContext) => {
  generateTypeDoc(monorepoContext);
  generateCliDocs(monorepoContext);
  generateEnvDocs(monorepoContext);
  generateWorkflowDocs();
};
