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
    // step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
    //   productName: context.productName,
    //   subdomainName: "root",
    // })),

    // step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
    //   productName: context.productName,
    //   subdomainName: "admin",
    // })),

    // step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
    //   productName: context.productName,
    //   subdomainName: "app",
    // })),

    // step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
    //   productName: context.productName,
    //   subdomainName: "auth",
    // })),

    // step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
    //   productName: context.productName,
    //   subdomainName: "account",
    // })),

    // step(makeWorkflowMachine(InitServiceWorkflowDefinition), ({ context }) => ({
    //   name: `${context.sharedPackagePrefix}-service`,
    //   path: `./services/${context.productName}`,
    // })),

    // step(makeWorkflowMachine(IdentityInitWorkflowDefinition), ({ context }) => ({
    //   name: `${context.sharedPackagePrefix}-identity`,
    //   path: `./services/${context.productName}-identity`,
    // })),

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
  ],
});

export default InitProductWorkflowDefinition;