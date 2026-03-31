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

const staticSubdomainDir = path.join(
  import.meta.dirname,
  "template",
  "__static-subdomain-name__",
);
const linksDir = path.join(import.meta.dirname, "template", "links");

const input = [
  {
    name: "productName",
    description: "Name of the new or existing product (e.g. 'product-name')",
    exampleValue: "product-name",
  },
  {
    name: "subdomainName",
    description: "Name of the new subdomain for the static site (e.g. 'docs')",
    exampleValue: "docs",
  },
] as const;

interface AddStaticSiteWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  productName: string;
  subdomainName: string;
  staticSubdomainName: string;
  staticPackageName: string;
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
    const staticSubdomainName = `${input.subdomainName}`;
    const staticPackageName = `${currentPackageOrgName}/${input.productName}-${staticSubdomainName}-static`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-links`;
    const commonPackageName = `${currentPackageOrgName}/${input.productName}-clients-common`;

    return {
      ...parsePackageName(staticPackageName, {
        requiredSuffix: "-static",
      }),
      targetDir,
      productName: input.productName,
      subdomainName: input.subdomainName,
      staticSubdomainName,
      staticPackageName,
      linksPackageName,
      commonPackageName,
      serviceName: input.productName,
    };
  },

  templateFiles: {
    packageJson: path.join(staticSubdomainDir, "package.json"),
    staticSite: staticSubdomainDir,
    linksPackage: linksDir,
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
