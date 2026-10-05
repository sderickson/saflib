import {
  CopyStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  CdStepMachine,
  CommandStepMachine,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";
import {
  caddyDev,
  clientsRoot,
  deployProductCaddy,
  deployTemplatesRoot,
  linksIndex,
  linksStub,
  makeBasePackageLineReplace,
  skipIfMissingDeploy,
  resolveDeployDir,
  devRoot,
} from "./shared.ts";

const staticSubdomainDir = path.join(
  clientsRoot,
  "__static-subdomain-name__",
);
const devDockerfile = path.join(devRoot, "Dockerfile.template");
// Image builds are discovered by `saf-docker build`; only the Caddy templates
// that assemble static sites need the new site added.
const deployCaddyBuild = ["builds", "caddy"];
const deployCaddyDockerfile = path.join(
  deployTemplatesRoot,
  ...deployCaddyBuild,
  "Dockerfile.template",
);

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
  /** Docker image prefix, e.g. `saflib-tmp` (matches product/init rewrite of `saflib-base`). */
  dockerImagePrefix: string;
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
    const parsed = parsePackageName(currentPackageName);
    const currentPackageOrgName = "@" + parsed.organizationName;
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
      dockerImagePrefix: `${parsed.organizationName}-${input.productName}`,
    };
  },

  // Clients stub + links area. Dev/deploy Caddy/docker use per-step overrides.
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
      lineReplace: makeBasePackageLineReplace(context),
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: path.join(
        context.cwd,
        context.productName,
        "dev",
        "caddy-config",
      ),
      templateFiles: {
        caddyDev,
      },
      lineReplace: makeBasePackageLineReplace(context),
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: path.join(context.cwd, context.productName, "dev"),
      templateFiles: {
        devDockerfile,
      },
      lineReplace: makeBasePackageLineReplace(context),
    })),

    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(resolveDeployDir(context.cwd), ...deployCaddyBuild),
        templateFiles: {
          deployCaddyDockerfile,
        },
        lineReplace: makeBasePackageLineReplace(context),
      }),
      {
        skipIf: skipIfMissingDeploy(...deployCaddyBuild, "Dockerfile.template"),
      },
    ),

    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(resolveDeployDir(context.cwd), "caddy"),
        templateFiles: {
          deployProductCaddy,
        },
        lineReplace: makeBasePackageLineReplace(context),
      }),
      { skipIf: skipIfMissingDeploy("caddy") },
    ),

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
  ],
});

export default AddStaticSiteWorkflowDefinition;
