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
import { existsSync } from "node:fs";

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

const devRoot = path.join(templatesProductRoot, "dev");
const caddyDev = path.join(devRoot, "caddy-config", "Caddyfile");
const buildImages = path.join(devRoot, "build-images.sh");
const devDockerfile = path.join(devRoot, "Dockerfile.template");

/** Deploy tree templates (until `saflib/deploy/` is restored). */
const deployTemplatesRoot = path.join(
  templatesProductRoot,
  "..",
  "product",
  "workflows",
  "templates",
  "deploy",
);
const deployBuildSh = path.join(
  deployTemplatesRoot,
  "local-scripts",
  "build.sh",
);
const deployProdDockerfile = path.join(deployTemplatesRoot, "Dockerfile.prod");
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

function makeAddStaticSiteLineReplace(context: AddStaticSiteWorkflowContext) {
  const lineReplace = makeLineReplace(context);
  const productPascal = kebabCaseToPascalCase(context.productName);
  const productSnake = kebabCaseToSnakeCase(context.productName);

  return (line: string) => {
    let out = line;
    // Golden static stub uses concrete @saflib/base-* names and base/ paths.
    out = out.split("@saflib/base-clients-common").join(context.commonPackageName);
    out = out.split("@saflib/base-links").join(context.linksPackageName);
    out = out.split("@saflib/base-sdk").join(context.serviceSdkName);
    out = out.split("@saflib/base-spec").join(context.serviceSpecName);
    out = out
      .split("@saflib/base-__static-subdomain-name__-static")
      .join(context.staticPackageName);
    out = out.split("BaseLayout").join(`${productPascal}Layout`);
    out = out.split("base_common_strings").join(`${productSnake}_common_strings`);
    // Dev docker / Caddy paths and tags still say `base` / `saflib-base` in golden stubs.
    out = out.split("saflib-base-").join(`${context.dockerImagePrefix}-`);
    out = out.split("/app/base/").join(`/app/${context.productName}/`);
    out = out.split("./base/").join(`./${context.productName}/`);
    out = out
      .split("/srv/base-static-")
      .join(`/srv/${context.productName}-static-`);
    out = out
      .split("/base-static-")
      .join(`/${context.productName}-static-`);
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
      lineReplace: makeAddStaticSiteLineReplace(context),
    })),

    // Upsert Caddy host into product dev Caddyfile (filled stub in golden base).
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
      lineReplace: makeAddStaticSiteLineReplace(context),
    })),

    // Upsert docker build/COPY into product dev stack (filled stubs in golden base;
    // `npm run dev` always runs `saf-docker generate` first).
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: path.join(context.cwd, context.productName, "dev"),
      templateFiles: {
        buildImages,
        devDockerfile,
      },
      lineReplace: makeAddStaticSiteLineReplace(context),
    })),

    // Upsert deploy docker builds when deploy/ exists.
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(context.cwd, "deploy", "local-scripts"),
        templateFiles: {
          deployBuildSh,
        },
        lineReplace: makeAddStaticSiteLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.cwd, "deploy", "local-scripts")),
      },
    ),

    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(context.cwd, "deploy"),
        templateFiles: {
          deployProdDockerfile,
        },
        lineReplace: makeAddStaticSiteLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.cwd, "deploy", "Dockerfile.prod")),
      },
    ),

    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: path.join(context.cwd, "deploy", "caddy"),
        templateFiles: {
          deployProductCaddy,
        },
        lineReplace: makeAddStaticSiteLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.cwd, "deploy", "caddy")),
      },
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
