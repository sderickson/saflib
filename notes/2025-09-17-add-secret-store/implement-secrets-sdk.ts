import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CdStepMachine,
} from "@saflib/workflows";
import {
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
} from "@saflib/sdk/workflows";
import path from "path";

const input = [] as const;

interface ImplementSecretsSdkContext {}

export const ImplementSecretsSdkWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsSdkContext
>({
  id: "secrets/implement-sdk",
  description: "Implement SDK queries for all secrets service API endpoints",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    overview: path.join(import.meta.dirname, "../../sdk/docs/01-overview.md"),
  },

  steps: [
    step(CdStepMachine, () => ({
      path: "./secrets/secrets-sdk",
    })),

    // Secrets resource: list (query), create/update/delete (mutations)
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "requests/secrets/list.ts",
      urlPath: "/secrets",
      method: "get",
    })),

    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "requests/secrets/create.ts",
      urlPath: "/secrets",
      method: "post",
    })),

    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "requests/secrets/update.ts",
      urlPath: "/secrets/{id}",
      method: "put",
    })),

    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "requests/secrets/delete.ts",
      urlPath: "/secrets/{id}",
      method: "delete",
    })),

    // Access requests: list (query), approve (mutation)
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "requests/access-requests/list.ts",
      urlPath: "/access-requests",
      method: "get",
    })),

    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "requests/access-requests/approve.ts",
      urlPath: "/access-requests/{id}/approve",
      method: "post",
    })),

    // Service tokens: list (query), approve (mutation)
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "requests/service-tokens/list.ts",
      urlPath: "/service-tokens",
      method: "get",
    })),

    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "requests/service-tokens/approve.ts",
      urlPath: "/service-tokens/{id}/approve",
      method: "post",
    })),
  ],
});

export default ImplementSecretsSdkWorkflowDefinition;
