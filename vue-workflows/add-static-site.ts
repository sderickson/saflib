import path from "node:path";
import {
  defineWorkflow,
  step,
  stepSkipIf,
  parsePackageName,
  getPackageName,
  runCopyStep,
  runCdStep,
  runCommandStep,
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
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

const staticSubdomainDir = path.join(clientsRoot, "__static-subdomain-name__");
const devDockerfile = path.join(devRoot, "Dockerfile.template");
// Image builds are discovered by `saf-docker build`; only the Caddy templates
// that assemble static sites need the new site added.
const deployCaddyBuild = ["builds", "caddy"];
const deployCaddyDockerfile = path.join(deployTemplatesRoot, ...deployCaddyBuild, "Dockerfile.template");

interface AddStaticSiteInput {
  productName: string;
  subdomainName: string;
}

interface AddStaticSiteWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  cwd: string;
  productName: string;
  subdomainName: string;
  staticSubdomainName: string;
  staticPackageName: string;
  linksPackageName: string;
  commonPackageName: string;
  serviceSpecName: string;
  serviceSdkName: string;
  serviceName: string;
  /** Docker image prefix, e.g. `saflib-tmp` (matches product/init rewrite of `saflib-base`). */
  dockerImagePrefix: string;
}

/**
 * Ported from `vue/workflows/add-static-site.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState. Several sequential `copy` steps touch different
 * destinations (static package dir, dev Caddy config, dev docker files,
 * deploy Caddy/docker files) rather than a single copy step — that was
 * already the old file's own shape. The deploy-guarded copy steps' old
 * `skipIf`s become `stepSkipIf`.
 */
export const AddStaticSiteWorkflowDefinition = defineWorkflow<
  AddStaticSiteInput,
  AddStaticSiteWorkflowContext
>({
  id: "vue/add-static-site",

  description: "Create a new SAF-powered static website using VitePress and Vuetify",

  inputSchema: {
    type: "object",
    properties: {
      productName: {
        type: "string",
        description: "Name of the new or existing product (e.g. 'product-name')",
      },
      subdomainName: {
        type: "string",
        description: "Name of the new subdomain for the static site (e.g. 'docs')",
      },
    },
    required: ["productName", "subdomainName"],
  },

  context: ({ input, cwd }) => {
    const targetDir = path.join(cwd, input.productName, "clients");
    const currentPackageName = getPackageName(cwd);
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
      cwd,
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

  steps: [
    step<CopyStepInput, AddStaticSiteWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        packageJson: path.join(staticSubdomainDir, "package.json"),
        staticSite: staticSubdomainDir,
        linksStub,
        linksIndex,
      },
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeBasePackageLineReplace(context),
    })),

    step<CopyStepInput, AddStaticSiteWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        caddyDev,
      },
      name: context.serviceName,
      targetDir: path.join(context.cwd, context.productName, "dev", "caddy-config"),
      lineReplace: makeBasePackageLineReplace(context),
    })),

    step<CopyStepInput, AddStaticSiteWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        devDockerfile,
      },
      name: context.serviceName,
      targetDir: path.join(context.cwd, context.productName, "dev"),
      lineReplace: makeBasePackageLineReplace(context),
    })),

    stepSkipIf<CopyStepInput, AddStaticSiteWorkflowContext>(
      skipIfMissingDeploy(...deployCaddyBuild, "Dockerfile.template"),
      "copy",
      runCopyStep,
      ({ context }) => ({
        templateFiles: {
          deployCaddyDockerfile,
        },
        name: context.serviceName,
        targetDir: path.join(resolveDeployDir(context.cwd), ...deployCaddyBuild),
        lineReplace: makeBasePackageLineReplace(context),
      }),
    ),

    stepSkipIf<CopyStepInput, AddStaticSiteWorkflowContext>(
      skipIfMissingDeploy("caddy"),
      "copy",
      runCopyStep,
      ({ context }) => ({
        templateFiles: {
          deployProductCaddy,
        },
        name: context.serviceName,
        targetDir: path.join(resolveDeployDir(context.cwd), "caddy"),
        lineReplace: makeBasePackageLineReplace(context),
      }),
    ),

    // packageJson is a fixed (non-templated) filename copied straight into
    // targetDir, so no need to reconstruct its path from copiedFiles.
    step<CdStepInput, AddStaticSiteWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, AddStaticSiteWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    step<CdStepInput, AddStaticSiteWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.cwd,
    })),

    step<CommandStepInput, AddStaticSiteWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-imports", "tsconfig", "generate", "--", "--write"],
    })),
  ],
});

export default AddStaticSiteWorkflowDefinition;
