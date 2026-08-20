import {
  CopyStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
  CdStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  getPackageName,
} from "@saflib/workflows";
import {
  kebabCaseToPascalCase,
  kebabCaseToSnakeCase,
  kebabCaseToCamelCase,
} from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Append `value` to a `KEY=a,b,c` line if missing. Leaves other lines unchanged.
 * Preserves a leading empty slot (`,auth,...`) used for the root domain.
 */
export function appendCommaSeparatedEnvValue(
  content: string,
  key: string,
  value: string,
): string {
  const prefix = `${key}=`;
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith(prefix)) {
        return line;
      }
      const indent = line.slice(0, line.length - trimmed.length);
      const current = trimmed.slice(prefix.length);
      const tokens = current === "" ? [] : current.split(",");
      if (tokens.includes(value)) {
        return line;
      }
      return `${indent}${prefix}${current},${value}`;
    })
    .join("\n");
}

const clientsRoot = path.join(templatesProductRoot, "clients");
const subdomainDir = path.join(clientsRoot, "__subdomain-name__");
const buildShimDir = path.join(clientsRoot, "build", "__subdomain-name__");
const linksStub = path.join(
  clientsRoot,
  "links",
  "__subdomain-name__-links.ts",
);
/** Upserts the subdomain-links workflow area into an existing links package. */
const linksIndex = path.join(clientsRoot, "links", "index.ts");

const devRoot = path.join(templatesProductRoot, "dev");
const caddyDev = path.join(devRoot, "caddy-config", "Caddyfile");

/** Deploy tree templates (until `saflib/deploy/` is restored). */
const deployTemplatesRoot = path.join(
  templatesProductRoot,
  "..",
  "product",
  "workflows",
  "templates",
  "deploy",
);
const deployProductCaddy = path.join(
  deployTemplatesRoot,
  "caddy",
  "__product-name__.Caddyfile",
);

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

function makeAddSpaLineReplace(context: AddSpaWorkflowContext) {
  const lineReplace = makeLineReplace(context);
  const productPascal = kebabCaseToPascalCase(context.productName);
  const productSnake = kebabCaseToSnakeCase(context.productName);

  return (line: string) => {
    let out = line;
    // Golden SPA / links stubs use concrete @saflib/base-* names.
    out = out.split("@saflib/base-clients-common").join(context.commonPackageName);
    out = out.split("@saflib/base-links").join(context.linksPackageName);
    out = out.split("@saflib/base-sdk").join(context.serviceSdkName);
    out = out.split("@saflib/base-spec").join(context.serviceSpecName);
    out = out
      .split("@saflib/base-__subdomain-name__-spa")
      .join(context.spaPackageName);
    out = out.split("DynamicBaseLayout").join(`Dynamic${productPascal}Layout`);
    out = out.split("base_common_strings").join(`${productSnake}_common_strings`);
    out = out.split("baseServiceFakeHandlers").join(
      `${kebabCaseToCamelCase(context.productName)}ServiceFakeHandlers`,
    );
    return lineReplace(out);
  };
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
    allowPaths: ["**/pages/home-page/**", "**/home/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeAddSpaLineReplace(context),
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
      lineReplace: makeAddSpaLineReplace(context),
    })),

    // Upsert SPA host into deploy product Caddyfile when deploy/ exists.
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(context.cwd, "deploy", "caddy"),
        templateFiles: {
          deployProductCaddy,
        },
        lineReplace: makeAddSpaLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.cwd, "deploy", "caddy")),
      },
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
        context.cwd,
        "deploy",
        `env.${context.productName}.prod-local`,
      ),
      skipIfMissing: true,
      description: `Add ${context.subdomainName} to CLIENT_SUBDOMAINS in deploy/env.${context.productName}.prod-local`,
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
