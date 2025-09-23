import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import { AddComponentWorkflowDefinition } from "@saflib/sdk/workflows";
import path from "path";
import { execSync } from "child_process";

const input = [] as const;

interface ImplementSecretsComponentsContext {}

export const ImplementSecretsComponentsWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsComponentsContext
>({
  id: "secrets/implement-components",
  description:
    "Implement Vue components for the secrets service management interface",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "spec.md"),
  },

  afterEach: () => {
    execSync("git add -A");
  },

  steps: [
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-sdk",
    })),

    // Display components for viewing data
    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/secrets-table",
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/pending-approvals-table",
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/missing-secrets-table",
    })),

    // Form component for creating/editing secrets
    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./forms/secret-form",
    })),
  ],
});

export default ImplementSecretsComponentsWorkflowDefinition;
