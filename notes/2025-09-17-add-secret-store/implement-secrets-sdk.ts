import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import { AddQueryWorkflowDefinition } from "@saflib/sdk/workflows";
import path from "path";
import { execSync } from "child_process";

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
  afterEach: () => {
    execSync("git add -A");
  },

  steps: [
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-sdk",
    })),

    // Secrets resource queries
    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/secrets/list.ts",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/secrets/create.ts",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/secrets/update.ts",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/secrets/delete.ts",
    })),

    // Access requests resource queries
    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/access-requests/list.ts",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/access-requests/approve.ts",
    })),

    // Service tokens resource queries
    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/service-tokens/list.ts",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "requests/service-tokens/approve.ts",
    })),
  ],
});

export default ImplementSecretsSdkWorkflowDefinition;
