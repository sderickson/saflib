import {
  CopyStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  CdStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";
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

const input = [
  {
    name: "productName",
    description: "Name of the new or existing product (e.g. 'product-name')",
    exampleValue: "product-name",
  },
  {
    name: "subdomainName",
    description: "Name of the new subdomain (e.g. 'admin')",
    exampleValue: "admin",
  },
] as const;

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  subdomainName: string;
  productName: string;
  spaPackageName: string;
  linksPackageName: string;
  commonPackageName: string;
  serviceSpecName: string;
  serviceSdkName: string;
}

export const AddSpaWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSpaWorkflowContext
>({
  id: "vue/add-spa",

  description:
    "Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query",

  checklistDescription: ({ packageName }) => `Init ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.productName, "clients");
    const currentPackageName = getPackageName(input.cwd);
    const currentPackageOrgName =
      "@" + parsePackageName(currentPackageName).organizationName;
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

  // Only SPA + the few clients/ files add-spa adjusts. product/init owns
  // build package scaffolding, common, and the rest of links.
  // Dev/deploy Caddy upserts use per-step templateFiles overrides.
  templateFiles: {
    packageJson: path.join(subdomainDir, "package.json"),
    spa: subdomainDir,
    buildShim: buildShimDir,
    linksStub,
    linksIndex,
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/pages/home/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeBasePackageLineReplace(context),
      // View / e2e expansion stubs live under the SPA stub but belong to
      // add-view / add-e2e-test — not a new SPA package.
      skipSourceGlobs: ["**/__group-name__/**", "**/e2e/**"],
    })),

    // Upsert SPA host into product dev Caddyfile.
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

    // Upsert SPA host into deploy product Caddyfile when deploy/ exists.
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

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        context.cwd,
        context.productName,
        "dev",
        "env.dev",
      ),
      description: `Add ${context.subdomainName} to CLIENT_SUBDOMAINS in ${context.productName}/dev/env.dev`,
      transform: (content: string) =>
        appendCommaSeparatedEnvValue(
          content,
          "CLIENT_SUBDOMAINS",
          context.subdomainName,
        ),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        resolveDeployDir(context.cwd),
        `env.${context.productName}.prod-local`,
      ),
      skipIfMissing: true,
      description: `Add ${context.subdomainName} to CLIENT_SUBDOMAINS in ${getDeployDirName()}/env.${context.productName}.prod-local`,
      transform: (content: string) =>
        appendCommaSeparatedEnvValue(
          content,
          "CLIENT_SUBDOMAINS",
          context.subdomainName,
        ),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: path.dirname(context.copiedFiles!.packageJson),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Build package already exists from product/init; just register the new SPA.
    step(CdStepMachine, ({ context }) => ({
      path: path.join(context.targetDir, "build"),
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["install", context.spaPackageName],
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
