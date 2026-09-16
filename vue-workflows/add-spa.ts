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
  runTransformFileStep,
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type TransformFileStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import {
  appendCommaSeparatedEnvValue,
  caddyDev,
  clientsRoot,
  deployProductCaddy,
  linksIndex,
  linksStub,
  makeBasePackageLineReplace,
  skipIfMissingDeploy,
  resolveDeployDir,
  getDeployDirName,
} from "./shared.ts";

const subdomainDir = path.join(clientsRoot, "__subdomain-name__");
const buildShimDir = path.join(clientsRoot, "build", "__subdomain-name__");

interface AddSpaInput {
  productName: string;
  subdomainName: string;
}

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  cwd: string;
  subdomainName: string;
  productName: string;
  spaPackageName: string;
  linksPackageName: string;
  commonPackageName: string;
  serviceSpecName: string;
  serviceSdkName: string;
  serviceName: string;
}

/**
 * Ported from `vue/workflows/add-spa.ts` — same templates, same prompts,
 * same step order, running on the new sqlite-backed engine instead of
 * XState. Several sequential `copy` steps touch different destinations
 * (SPA package dir, dev Caddy config, deploy Caddy config) rather than a
 * single copy step — that was already the old file's own shape, not a
 * new pattern introduced by this port. The deploy-guarded copy step's
 * old `skipIf` becomes `stepSkipIf`.
 */
export const AddSpaWorkflowDefinition = defineWorkflow<AddSpaInput, AddSpaWorkflowContext>({
  id: "vue/add-spa",

  description: "Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query",

  inputSchema: {
    type: "object",
    properties: {
      productName: {
        type: "string",
        description: "Name of the new or existing product (e.g. 'product-name')",
      },
      subdomainName: {
        type: "string",
        description: "Name of the new subdomain (e.g. 'admin')",
      },
    },
    required: ["productName", "subdomainName"],
  },

  context: ({ input, cwd }) => {
    const targetDir = path.join(cwd, input.productName, "clients");
    const currentPackageName = getPackageName(cwd);
    const currentPackageOrgName = "@" + parsePackageName(currentPackageName).organizationName;
    const spaPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-spa`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-links`;
    const commonPackageName = `${currentPackageOrgName}/${input.productName}-clients-common`;
    const serviceSpecName = `${currentPackageOrgName}/${input.productName}-spec`;
    const serviceSdkName = `${currentPackageOrgName}/${input.productName}-sdk`;

    return {
      ...parsePackageName(spaPackageName, {
        requiredSuffix: "-spa",
      }),
      targetDir,
      cwd,
      productName: input.productName,
      subdomainName: input.subdomainName,
      linksPackageName,
      spaPackageName,
      commonPackageName,
      serviceSpecName,
      serviceSdkName,
      serviceName: input.productName,
    };
  },

  steps: [
    step<CopyStepInput, AddSpaWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        packageJson: path.join(subdomainDir, "package.json"),
        spa: subdomainDir,
        buildShim: buildShimDir,
        linksStub,
        linksIndex,
      },
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeBasePackageLineReplace(context),
      // View / e2e expansion stubs live under the SPA stub but belong to
      // add-view / add-e2e-test — not a new SPA package.
      skipSourceGlobs: ["**/__group-name__/**", "**/e2e/**"],
    })),

    // Upsert SPA host into product dev Caddyfile.
    step<CopyStepInput, AddSpaWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        caddyDev,
      },
      name: context.serviceName,
      targetDir: path.join(context.cwd, context.productName, "dev", "caddy-config"),
      lineReplace: makeBasePackageLineReplace(context),
    })),

    // Upsert SPA host into deploy product Caddyfile when deploy/ exists.
    stepSkipIf<CopyStepInput, AddSpaWorkflowContext>(
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

    step<TransformFileStepInput, AddSpaWorkflowContext>(
      "transform-file",
      runTransformFileStep,
      ({ context }) => ({
        filePath: path.join(context.cwd, context.productName, "dev", "env.dev"),
        description: `Add ${context.subdomainName} to CLIENT_SUBDOMAINS in ${context.productName}/dev/env.dev`,
        transform: (content: string) =>
          appendCommaSeparatedEnvValue(content, "CLIENT_SUBDOMAINS", context.subdomainName),
      }),
    ),

    step<TransformFileStepInput, AddSpaWorkflowContext>(
      "transform-file",
      runTransformFileStep,
      ({ context }) => ({
        filePath: path.join(resolveDeployDir(context.cwd), `env.${context.productName}.prod-local`),
        skipIfMissing: true,
        description: `Add ${context.subdomainName} to CLIENT_SUBDOMAINS in ${getDeployDirName()}/env.${context.productName}.prod-local`,
        transform: (content: string) =>
          appendCommaSeparatedEnvValue(content, "CLIENT_SUBDOMAINS", context.subdomainName),
      }),
    ),

    // packageJson is a fixed (non-templated) filename copied straight into
    // targetDir, so no need to reconstruct its path from copiedFiles.
    step<CdStepInput, AddSpaWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, AddSpaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Build package already exists from product/init; just register the new SPA.
    step<CdStepInput, AddSpaWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: path.join(context.targetDir, "build"),
    })),

    step<CommandStepInput, AddSpaWorkflowContext>("command", runCommandStep, ({ context }) => ({
      command: "npm",
      args: ["install", context.spaPackageName],
    })),

    step<CdStepInput, AddSpaWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.cwd,
    })),

    step<CommandStepInput, AddSpaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-imports", "tsconfig", "generate", "--", "--write"],
    })),
  ],
});

export default AddSpaWorkflowDefinition;
