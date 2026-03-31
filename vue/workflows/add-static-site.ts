import {
  CopyStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
  CdStepMachine,
  CommandStepMachine,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";

const staticRootDir = path.join(
  import.meta.dirname,
  "template",
  "static-root",
);

const input = [
  {
    name: "productName",
    description: "Name of the new or existing product (e.g. 'product-name')",
    exampleValue: "product-name",
  },
] as const;

interface AddStaticSiteWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  productName: string;
  staticRootPackageName: string;
  linksPackageName: string;
  commonPackageName: string;
}

export const VueAddStaticSiteWorkflowDefinition = defineWorkflow<
  typeof input,
  AddStaticSiteWorkflowContext
>({
  id: "vue/add-static-site",

  description:
    "Create a new SAF-powered static website using VitePress and Vuetify",

  checklistDescription: ({ packageName }) => `Init ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.productName, "clients");
    const currentPackageName = getPackageName(input.cwd);
    const currentPackageOrgName =
      "@" + parsePackageName(currentPackageName).organizationName;
    const staticRootPackageName = `${currentPackageOrgName}/${input.productName}-static-root`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-links`;
    const commonPackageName = `${currentPackageOrgName}/${input.productName}-clients-common`;

    return {
      ...parsePackageName(staticRootPackageName, {
        requiredSuffix: "-static-root",
      }),
      targetDir,
      productName: input.productName,
      staticRootPackageName,
      linksPackageName,
      commonPackageName,
    };
  },

  templateFiles: {
    packageJson: path.join(staticRootDir, "package.json"),
    staticRoot: staticRootDir,
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/content/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const lineReplace = makeLineReplace(context);

      const wrappedLineReplace = (line: string) => {
        line = line.replace(
          "template-package-clients-common",
          context.commonPackageName,
        );
        line = line.replace("template-package-links", context.linksPackageName);
        return lineReplace(line);
      };
      return {
        name: context.serviceName,
        targetDir: context.targetDir,
        lineReplace: wrappedLineReplace,
      };
    }),

    step(CdStepMachine, ({ context }) => ({
      path: path.dirname(context.copiedFiles!.packageJson),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
  ],
});

export default VueAddStaticSiteWorkflowDefinition;
