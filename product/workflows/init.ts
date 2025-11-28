import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CopyStepMachine,
  makeLineReplace,
  CommandStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  type ParsePackageNameOutput,
  PromptStepMachine,
} from "@saflib/workflows";
import { AddSpaWorkflowDefinition } from "@saflib/vue/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import path from "node:path";
import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";

const input = [
  {
    name: "name",
    description:
      "Name of the new product",
    exampleValue: "foo",
  },
] as const;

interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
}

export const InitProductWorkflowDefinition = defineWorkflow<
  typeof input,
  InitProductWorkflowContext
>({
  id: "product/init",

  description:
    "Create a new product",

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
    };
  },

  templateFiles: {
    deploy: path.join(import.meta.dirname, "templates/deploy/__product-name__-dev"),
    monolith: path.join(import.meta.dirname, "templates/services/__product-name__-monolith"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: [],
  },

  steps: [
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "root",
    })),

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

    step(makeWorkflowMachine(InitServiceWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-service`,
      path: `./services/${context.productName}`,
    })),

    step(makeWorkflowMachine(IdentityInitWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-identity`,
      path: `./services/${context.productName}-identity`,
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context)
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: path.join(context.cwd, `./services/${context.productName}-monolith`),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate", "--", "--combined"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./deploy/${context.productName}-dev`,
    })),

    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["./.env"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-root-spa`,
    })),

    step(PromptStepMachine, () => ({
      "prompt": "Update the home page to have a call to action to the register page. Use linkToProps from @saflib/links to create the link and bind them to the vuetify."
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-auth-spa`,
    })),

    step(PromptStepMachine, () => ({
      "prompt": "Update the auth spa to use the @saflib/auth package's router using 'createAuthRouter'. That will provide login, register, forgot password, and logout pages. Make sure it redirects to the app spa's home page after login, using linkToHref from @saflib/links."
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-account-spa`,
    })),

    step(PromptStepMachine, () => ({
      "prompt": "Update the account spa to use the @saflib/account package's pages for changing password and updating profile. Make sure it redirects to the account spa's home page after the changes."
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-clients-common`,
    })),

    step(PromptStepMachine, () => ({
      "prompt": `Update the ./components/__product-name__-layout/__ProductName__Layout.vue file, adding links to the various spas. The `
    })),
  ],
});

export default InitProductWorkflowDefinition;