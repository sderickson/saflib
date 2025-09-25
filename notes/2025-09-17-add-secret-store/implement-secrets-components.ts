import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import { AddComponentWorkflowDefinition } from "@saflib/sdk/workflows";
import { AddSpaPageWorkflowDefinition } from "@saflib/vue/workflows";
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

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./forms/update-secret-form",
      systemPrompt: `The UpdateSecretForm component takes a secret and shows it in a v-form. It can take a secret name and if it does, the secret name field should be disabled. It handles updating the secret and emits a success event with the result.`,
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/secrets-table",
      systemPrompt: `The SecretsTable component takes a list of secrets and shows them in a v-table. It has buttons for editing and deleting secrets and a button for showing details in a v-dialog. Uses the "UpdateSecretForm" component for the edit form.`,
    })),

    // Display components for viewing data
    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/access-request-table",
      systemPrompt: `The AccessRequestTable component takes a single access request and shows all of its details. Use a v-table.
      `,
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/access-requests-table",
      systemPrompt: `The AccessRequestsTable component takes a list of access requests and shows them in a v-data-table. It also has buttons for approving and denying access requests and changing them between, and a button for showing details in a v-dialog. Uses the "AccessRequestTable" component for the details dialog.`,
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./forms/create-secret-form",
      systemPrompt: `The CreateSecretForm component takes a secret and shows it in a v-form. It can take a secret name and if it does, the secret name field should be disabled. It handles creating the secret and emits a success event with the result.`,
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/missing-secrets-table",
      systemPrompt: `The MissingSecretsTable component takes a list of access requests for missing secrets and shows them in a v-data-table. It also has a button for creating a new secret in a v-dialog. Uses the "CreateSecretForm" component for the create form.`,
    })),

    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./displays/service-tokens-table",
      systemPrompt: `The ServiceTokensTable component takes a list of service tokens and shows them in a v-data-table.`,
    })),

    // Page component for the main management interface
    step(makeWorkflowMachine(AddSpaPageWorkflowDefinition), () => ({
      path: "./pages/secret-manager",
      systemPrompt: `The SecretManager page loads all (first 100) secrets, access requests, and service tokens and shows them in a v-tabs. It has three tabs: secrets, access-requests, and service-tokens. Uses the "SecretsTable", "AccessRequestsTable", and "ServiceTokensTable" components for the tabs. Also include the "MissingSecretsTable" component for the secrets tab; the page will need to determine which access requests are missing secrets and pass those.`,
    })),
  ],
});

export default ImplementSecretsComponentsWorkflowDefinition;
