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
import {
  kebabCaseToPascalCase,
  kebabCaseToSnakeCase,
} from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const clientsRoot = path.join(templatesProductRoot, "clients");
const staticSubdomainDir = path.join(
  clientsRoot,
  "__static-subdomain-name__",
);
const linksStub = path.join(
  clientsRoot,
  "links",
  "__subdomain-name__-links.ts",
);
/** Upserts the subdomain-links workflow area into an existing links package. */
const linksIndex = path.join(clientsRoot, "links", "index.ts");

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
  serviceSpecName: string;
  serviceSdkName: string;
}

function makeAddStaticSiteLineReplace(context: AddStaticSiteWorkflowContext) {
  const lineReplace = makeLineReplace(context);
  const productPascal = kebabCaseToPascalCase(context.productName);
  const productSnake = kebabCaseToSnakeCase(context.productName);

  return (line: string) => {
    let out = line;
    // Golden static stub uses concrete @saflib/base-* names.
    out = out.split("@saflib/base-clients-common").join(context.commonPackageName);
    out = out.split("@saflib/base-links").join(context.linksPackageName);
    out = out.split("@saflib/base-sdk").join(context.serviceSdkName);
    out = out.split("@saflib/base-spec").join(context.serviceSpecName);
    out = out
      .split("@saflib/base-__static-subdomain-name__-static")
      .join(context.staticPackageName);
    out = out.split("BaseLayout").join(`${productPascal}Layout`);
    out = out.split("base_common_strings").join(`${productSnake}_common_strings`);
    return lineReplace(out);
  };
}

export const AddStaticSiteWorkflowDefinition = defineWorkflow<
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
    const staticSubdomainName = input.subdomainName;
    const staticPackageName = `${currentPackageOrgName}/${input.productName}-${staticSubdomainName}-static`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-links`;
    const commonPackageName = `${currentPackageOrgName}/${input.productName}-clients-common`;
    const serviceSpecName = `${currentPackageOrgName}/${input.productName}-spec`;
    const serviceSdkName = `${currentPackageOrgName}/${input.productName}-sdk`;

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
      serviceSpecName,
      serviceSdkName,
      serviceName: input.productName,
    };
  },

  // Only the static site stub + links area upsert. product/init owns common
  // and the rest of the links package.
  templateFiles: {
    packageJson: path.join(staticSubdomainDir, "package.json"),
    staticSite: staticSubdomainDir,
    linksStub,
    linksIndex,
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/content/**", "**/deploy/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeAddStaticSiteLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: path.dirname(context.copiedFiles!.packageJson),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.cwd,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: [
        "exec",
        "saf-imports",
        "tsconfig",
        "generate",
        "--",
        "--write",
      ],
    })),

    // TODO: automate Caddy + docker image wiring (dev/build-images.sh,
    // deploy/local-scripts/build.sh, Dockerfile.prod) the way add-spa
    // appends CLIENT_SUBDOMAINS — static sites are not Vite SPAs.
  ],
});

export default AddStaticSiteWorkflowDefinition;
