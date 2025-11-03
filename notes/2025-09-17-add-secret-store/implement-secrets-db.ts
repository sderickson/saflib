import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import {
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
} from "@saflib/drizzle/workflows";
import path from "path";

const input = [] as const;

interface ImplementSecretsDbContext {}

export const ImplementSecretsDbWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsDbContext
>({
  id: "secrets/implement-db",
  description: "Implement the database layer for the secrets service",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "spec.md"),
  },

  steps: [
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-db",
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/secret.ts",
      systemPrompt: `The secret table requires the following fields:

      - id: TEXT PRIMARY KEY (random UUID)
      - name: TEXT UNIQUE NOT NULL  
      - description: TEXT
      - value_encrypted: BLOB (for AES-256 encrypted secret value)
      - created_at: INTEGER NOT NULL
      - updated_at: INTEGER NOT NULL
      - created_by: TEXT NOT NULL
      - is_active: BOOLEAN DEFAULT true`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/create",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/get-by-id",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/get-by-name",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/update",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/remove",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/list",
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/service-token.ts",
      systemPrompt: `The service_token table requires the following fields:

      - id: TEXT PRIMARY KEY (random UUID)
      - service_name: TEXT NOT NULL
      - token_hash: TEXT UNIQUE NOT NULL (SHA-256 hash of token)
      - service_version: TEXT
      - requested_at: INTEGER NOT NULL
      - approved: BOOLEAN DEFAULT false
      - approved_at: INTEGER
      - approved_by: TEXT
      - last_used_at: INTEGER
      - access_count: INTEGER DEFAULT 0`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/create",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/get-by-hash",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/update-approval",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/update-usage",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/list",
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/access-request.ts",
      systemPrompt: `The access_request table requires the following fields:

      - id: TEXT PRIMARY KEY (random UUID)
      - secret_id: TEXT NOT NULL REFERENCES secrets(id)
      - service_name: TEXT NOT NULL
      - requested_at: INTEGER NOT NULL
      - status: TEXT NOT NULL ('pending', 'granted', 'denied')
      - granted_at: INTEGER
      - granted_by: TEXT
      - access_count: INTEGER DEFAULT 0
      - last_accessed_at: INTEGER`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/create",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/get-by-id",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/update-status",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/update-usage",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/list-pending",
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/list-by-service",
    })),
  ],
});

export default ImplementSecretsDbWorkflowDefinition;
