import {
  defineWorkflow,
  step,
  CopyStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";
import { templatesRoot } from "@saflib/templates";
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

const SOURCE_PACKAGE_PREFIX = "@saflib/templates";
const SOURCE_PRODUCT_NAME = "templates";
const SOURCE_DOMAIN = "example.com";

function makeProductInitLineReplace(context: InitProductWorkflowContext) {
  const pascal = kebabCaseToPascalCase(context.productName);
  const snakeUpper = kebabCaseToSnakeCase(context.productName).toUpperCase();
  const dockerFrom = `saflib-${SOURCE_PRODUCT_NAME}`;
  const dockerTo = `${context.organizationName}-${context.productName}`;

  return (line: string) => {
    const preserveWorkflowsTemplatesExclude = line.includes(
      "workflows/templates",
    );
    let out = line;
    out = out.split(SOURCE_PACKAGE_PREFIX).join(context.sharedPackagePrefix);
    out = out.split("@saflib/deploy").join(`@${context.organizationName}/deploy`);
    out = out.split(dockerFrom).join(dockerTo);
    out = out.split(SOURCE_DOMAIN).join(context.domainName);
    out = out.split("Templates").join(pascal);
    out = out.split("TEMPLATES").join(snakeUpper);
    if (!preserveWorkflowsTemplatesExclude) {
      out = out.split(SOURCE_PRODUCT_NAME).join(context.productName);
    }
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

  templateFiles: {
    clients: path.join(templatesRoot, "clients"),
    service: path.join(templatesRoot, "service"),
    dev: path.join(templatesRoot, "dev"),
    plans: path.join(templatesRoot, "plans"),
    deploy: path.join(templatesRoot, "deploy"),
    github: path.join(templatesRoot, ".github"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `**/${context.productName}/clients/**`,
      `./package.json`,
      `**/${context.productName}/service/**`,
      `./deploy/**`,
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
      lineReplace: makeProductInitLineReplace(context),
    })),
    step(CommandStepMachine, ({ context }) => ({
      command: "mv",
      args: [`./${context.productName}/deploy`, `./deploy`],
    })),
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "mv",
        args: [`./${context.productName}/.github`, `./.github`],
      }),
      {
        skipIf: ({ context }) =>
          getPackageName(context.cwd) === "@saflib/saflib",
      },
    ),
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "rm",
        args: ["-rf", `./${context.productName}/.github`],
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
