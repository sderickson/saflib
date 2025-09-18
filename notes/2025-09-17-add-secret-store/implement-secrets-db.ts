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
import { execSync } from "child_process";

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

  afterEach: () => {
    execSync("git add -A");
  },

  steps: [
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-db",
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/secret.ts",
      systemPrompt: `Add the secret table:

      - id: TEXT PRIMARY KEY (random UUID)
      - name: TEXT UNIQUE NOT NULL  
      - description: TEXT
      - value_encrypted: BLOB (for AES-256 encrypted secret value)
      - created_at: INTEGER NOT NULL
      - updated_at: INTEGER NOT NULL
      - created_by: TEXT NOT NULL
      - is_active: BOOLEAN DEFAULT true

      Use proper Drizzle SQLite types and add the type inference test.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/create",
      systemPrompt: `Implement the \`create\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/get-by-id",
      systemPrompt: `Implement the \`getById\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/get-by-name",
      systemPrompt: `Implement the \`getByName\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/update",
      systemPrompt: `Implement the \`update\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/remove",
      systemPrompt: `Implement the \`delete\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secret/list",
      systemPrompt: `Implement the \`list\` query for the secret table.`,
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/service-token.ts",
      systemPrompt: `Add the service_token table:

      - id: TEXT PRIMARY KEY (random UUID)
      - service_name: TEXT NOT NULL
      - token_hash: TEXT UNIQUE NOT NULL (SHA-256 hash of token)
      - service_version: TEXT
      - requested_at: INTEGER NOT NULL
      - approved: BOOLEAN DEFAULT false
      - approved_at: INTEGER
      - approved_by: TEXT
      - last_used_at: INTEGER
      - access_count: INTEGER DEFAULT 0

      Use proper Drizzle SQLite types and add the type inference test.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/create",
      systemPrompt: `Implement the \`create\` query for the service_token table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/get-by-hash",
      systemPrompt: `Implement the \`getByHash\` query for the service_token table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/update-approval",
      systemPrompt: `Implement the \`updateApproval\` query for the service_token table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/update-usage",
      systemPrompt: `Implement the \`updateUsage\` query for the service_token table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-token/list",
      systemPrompt: `Implement the \`list\` query for the service_token table.`,
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/access-request.ts",
      systemPrompt: `Add the access_request table:

      - id: TEXT PRIMARY KEY (random UUID)
      - secret_id: TEXT NOT NULL REFERENCES secrets(id)
      - service_name: TEXT NOT NULL
      - requested_at: INTEGER NOT NULL
      - status: TEXT NOT NULL ('pending', 'granted', 'denied')
      - granted_at: INTEGER
      - granted_by: TEXT
      - access_count: INTEGER DEFAULT 0
      - last_accessed_at: INTEGER

      Use proper Drizzle SQLite types and add the type inference test.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/create",
      systemPrompt: `Implement the \`create\` query for the access_request table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/get-by-id",
      systemPrompt: `Implement the \`getById\` query for the access_request table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/update-status",
      systemPrompt: `Implement the \`updateStatus\` query for the access_request table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/update-usage",
      systemPrompt: `Implement the \`updateUsage\` query for the access_request table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/list-pending",
      systemPrompt: `Implement the \`listPending\` query for the access_request table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-request/list-by-service",
      systemPrompt: `Implement the \`listByService\` query for the access_request table.`,
    })),
  ],
});

export default ImplementSecretsDbWorkflowDefinition;
