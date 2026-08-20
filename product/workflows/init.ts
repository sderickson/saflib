import {
  defineWorkflow,
  step,
  CopyStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";
import {
  templatesProductRoot,
  templatesDeployRoot,
  templatesScaffoldRoot,
} from "@saflib/templates";
import path from "node:path";

const input = [
  {
    name: "name",
    description: "Name of the new product",
    exampleValue: "foo",
  },
  {
    name: "domain",
    description: "Domain of the new product",
    exampleValue: "example.com",
  },
] as const;

interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
  domainName: string;
}

/** Frozen golden-product name under saflib (`saflib/base`). */
const SOURCE_PRODUCT_NAME = "base";
const SOURCE_PACKAGE_PREFIX = `@saflib/${SOURCE_PRODUCT_NAME}`;
const SOURCE_DOMAIN = "example.com";

/**
 * Rewrite saflib-root volume mounts (`../..:/app` + anonymous node_modules)
 * to the product-beside-saflib shape (product clients/sdk + `saflib/`).
 * Context stays `../..`.
 */
function toProductMonorepoDevCompose(
  content: string,
  productName: string,
): string {
  const productMounts = [
    `      - ../../${productName}/clients/:/app/${productName}/clients/`,
    `      - ../../saflib/:/app/saflib/`,
    `      - ../../${productName}/service/sdk/:/app/${productName}/service/sdk/`,
  ].join("\n");
  const monolithMounts = [
    `      - ../../${productName}/service/db/data:/app/${productName}/service/db/data`,
    `      - ../../${productName}/service/cron/data:/app/${productName}/service/cron/data`,
  ].join("\n");

  let out = content.replace(
    /volumes:\n(?:[ \t]*#[^\n]*\n)*[ \t]*- \.\.\/\.\.:\/app\n[ \t]*- \/app\/node_modules\n([ \t]*command: npm run dev)/,
    `volumes:\n${productMounts}\n$1`,
  );
  out = out.replace(
    new RegExp(
      `(  ${productName}-monolith:[\\s\\S]*?volumes:\\n)(?:[ \\t]*#[^\\n]*\\n)*[ \\t]*- \\.\\.\\/\\.\\.:\\/app\\n[ \\t]*- \\/app\\/node_modules\\n`,
    ),
    `$1${monolithMounts}\n`,
  );
  return out;
}

function makeProductInitLineReplace(context: InitProductWorkflowContext) {
  const placeholderReplace = makeLineReplace(context);
  const dockerFrom = `saflib-${SOURCE_PRODUCT_NAME}`;
  const dockerTo = `${context.organizationName}-${context.productName}`;
  const pascal = kebabCaseToPascalCase(context.productName);
  const snakeUpper = kebabCaseToSnakeCase(context.productName).toUpperCase();
  const sourcePascal = kebabCaseToPascalCase(SOURCE_PRODUCT_NAME);
  const sourceSnakeUpper =
    kebabCaseToSnakeCase(SOURCE_PRODUCT_NAME).toUpperCase();

  return (line: string) => {
    // Never rewrite workflow template paths or the thin @saflib/templates package.
    if (
      line.includes("workflows/templates") ||
      line.includes("@saflib/templates") ||
      line.includes("saflib/templates/")
    ) {
      return placeholderReplace(line);
    }

    // Drop the co-located SPA stub from CLIENT_SUBDOMAINS before placeholder
    // replace (init has no subdomainName; add-spa appends real names later).
    let prepared = line;
    if (/^\s*CLIENT_SUBDOMAINS=/.test(prepared)) {
      prepared = prepared.replace(/,__subdomain-name__/g, "");
    }

    let out = placeholderReplace(prepared);
    out = out.split(SOURCE_PACKAGE_PREFIX).join(context.sharedPackagePrefix);
    out = out
      .split("@saflib/deploy")
      .join(`@${context.organizationName}/deploy`);
    out = out.split(dockerFrom).join(dockerTo);
    out = out.split(SOURCE_DOMAIN).join(context.domainName);

    // Path / token renames — avoid bare "base" (database, based, …).
    out = out.replaceAll(`/${SOURCE_PRODUCT_NAME}/`, `/${context.productName}/`);
    out = out.replaceAll(
      `./${SOURCE_PRODUCT_NAME}/`,
      `./${context.productName}/`,
    );
    out = out.replaceAll(`${SOURCE_PRODUCT_NAME}-`, `${context.productName}-`);
    out = out.replaceAll(
      `/${SOURCE_PRODUCT_NAME}-`,
      `/${context.productName}-`,
    );
    out = out.replaceAll(`${sourceSnakeUpper}_`, `${snakeUpper}_`);
    out = out.replaceAll(sourcePascal, pascal);

    out = out.replace(
      new RegExp(`\\b${SOURCE_PRODUCT_NAME}\\b`, "g"),
      context.productName,
    );
    out = out.replace(
      new RegExp(`\\b${sourceSnakeUpper}\\b`, "g"),
      snakeUpper,
    );

    return out;
  };
}

export const InitProductWorkflowDefinition = defineWorkflow<
  typeof input,
  InitProductWorkflowContext
>({
  id: "product/init",

  description: "Create a new product",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const packageName = getPackageName(input.cwd);
    const packageInfo = parsePackageName(packageName);

    return {
      productName: input.name,
      sharedPackagePrefix: `@${packageInfo.organizationName}/${input.name}`,
      organizationName: packageInfo.organizationName,
      packageName: "PACKAGE_NAME_UNUSED",
      serviceName: input.name,
      domainName: input.domain,
    };
  },

  // Copied via per-step templateFiles overrides (product, deploy, scaffold).
  templateFiles: {},

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `**/${context.productName}/**`,
      `./package.json`,
      `./deploy/**`,
      `./.github/**`,
    ],
    commitEachStep: true,
  },

  steps: [
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.cwd, "package.json"),
      description: `Add ${context.productName}/** to workspaces in package.json`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        const workspaces = Array.from(
          new Set([...pkg.workspaces, `${context.productName}/**`]),
        );
        workspaces.sort();
        pkg.workspaces = workspaces;
        return JSON.stringify(pkg, null, 2) + "\n";
      },
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "prettier", "--", "package.json", "--write"],
    })),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: path.join(context.cwd, context.productName),
      templateFiles: { product: templatesProductRoot },
      lineReplace: makeProductInitLineReplace(context),
      // Keep expansion stubs (__subdomain-name__, __group-name__, …) in base only.
      // Both globs: dir trees (`__/…`) and stub filenames (`__…__-links.ts`).
      skipSourceGlobs: ["**/__*__/**", "**/__*__*"],
    })),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: path.join(context.cwd, "deploy"),
      templateFiles: { deploy: templatesDeployRoot },
      lineReplace: makeProductInitLineReplace(context),
    })),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: context.cwd,
      templateFiles: { scaffold: templatesScaffoldRoot },
      lineReplace: makeProductInitLineReplace(context),
    })),
    // Golden product compose mounts the whole saflib root; rewrite for product-beside-saflib.
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        context.cwd,
        context.productName,
        "dev",
        "docker-compose.yaml",
      ),
      description: "Rewrite base/dev compose volumes for product monorepo layout",
      transform: (content: string) =>
        toProductMonorepoDevCompose(content, context.productName),
    })),
    // Product scaffold may include repo-root CI; never keep them in @saflib/saflib.
    step(
      CommandStepMachine,
      () => ({
        command: "rm",
        args: [
          "-rf",
          ".github/workflows/playwright.yml",
          ".github/workflows/typecheck.yml",
          ".github/workflows/push.yml",
          ".github/actions/setup-node-deps",
        ],
      }),
      {
        skipIf: ({ context }) =>
          getPackageName(context.cwd) !== "@saflib/saflib",
      },
    ),
    step(CommandStepMachine, ({ context }) => ({
      command: "mv",
      args: [
        `./deploy/remote-assets/env.${context.productName}.secrets`,
        `./deploy/remote-assets/.env.${context.productName}.secrets`,
      ],
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
    step(CdStepMachine, ({ context }) => {
      return {
        path: `./${context.productName}/service/monolith`,
      };
    }),
    step(CommandStepMachine, () => {
      return {
        command: "npm",
        args: ["exec", "saf-env", "generate", "--", "--combined"],
      };
    }),
    step(CdStepMachine, ({ context }) => {
      return {
        path: `./${context.productName}/dev`,
      };
    }),
    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["./.env"],
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
    step(CdStepMachine, () => ({
      path: `./deploy`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "regen-kratos-secrets"],
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});

export default InitProductWorkflowDefinition;
