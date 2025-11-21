import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
} from "@saflib/workflows";
import { AddSpaWorkflowDefinition } from "@saflib/vue/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";

const input = [
  {
    name: "name",
    description:
      "Name of the new product",
    exampleValue: "foo",
  },
] as const;

interface InitProductWorkflowContext  {
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
    const context = {
      productName: input.name,
    };

    return context;
  },

  templateFiles: {},

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
      name: `${context.productName}-service`,
      path: `./services/${context.productName}`,
    })),
  ],
});

export default InitProductWorkflowDefinition;