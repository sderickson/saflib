import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CopyStepMachine,
  makeLineReplace,
  CommandStepMachine,
  TransformFileStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  type ParsePackageNameOutput,
  PromptStepMachine,
} from "@saflib/workflows";
import {
  AddSpaWorkflowDefinition,
  // AddSpaViewWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
} from "@saflib/vue/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import path from "node:path";
// import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";

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

/**
 * TODO:
 * - figure out how to make links between spas and pages get added more consistently.
 *   Maybe start with a left nav, auto-add pages there, and add spas to top nav?
 */

interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
  domainName: string;
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
    all: path.join(import.meta.dirname, "templates/"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `**/${context.productName}/clients/**`,
      `./package.json`,
      `**/${context.productName}/service/${context.productName}-service/**`,
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
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-service`,
      path: `./${context.productName}/service`,
    })),
    step(
      makeWorkflowMachine(AddStaticSiteWorkflowDefinition),
      ({ context }) => ({
        productName: context.productName,
        subdomainName: "root",
      }),
    ),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "admin",
    })),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "app",
    })),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "auth",
    })),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "account",
    })),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context),
    })),
    step(CommandStepMachine, ({ context }) => ({
      command: "rm",
      args: [
        "-rf",
        `./${context.productName}/service/${context.productName}-service`,
      ],
    })),

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
      path: `./${context.productName}/clients/auth`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/ory-kratos-spa", "@saflib/ory-kratos-sdk"],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Integrate @saflib/ory-kratos-spa with the ${context.productName} auth SPA. Basically:
* have router.ts import and use createKratosAuthRouter from @saflib/ory-kratos-spa/router
* have strings.ts import the strings from @saflib/ory-kratos-spa/strings and spread them into auth_strings
* have test-app.ts import and re-export @saflib/ory-kratos-sdk/fakes as testAppHandlers`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, () => ({
      path: `./deploy`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});

export default InitProductWorkflowDefinition;
