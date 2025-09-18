import {
  DocStepMachine,
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
    step(DocStepMachine, () => ({
      docId: "spec",
    })),

    step(CwdStepMachine, () => ({
      path: "/Users/scotterickson/src/saf-2025/saflib/secrets/secrets-db",
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/secrets.ts",
      systemPrompt: `Add the secrets table:

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
      path: "queries/secrets/create",
      systemPrompt: `Implement the \`create\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secrets/get-by-id",
      systemPrompt: `Implement the \`getById\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secrets/get-by-name",
      systemPrompt: `Implement the \`getByName\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secrets/update",
      systemPrompt: `Implement the \`update\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secrets/remove",
      systemPrompt: `Implement the \`delete\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/secrets/list",
      systemPrompt: `Implement the \`list\` query for the secrets table.`,
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/service-tokens.ts",
      systemPrompt: `Add the service_tokens table:

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
      path: "queries/service-tokens/create",
      systemPrompt: `Implement the \`create\` query for the service_tokens table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-tokens/get-by-hash",
      systemPrompt: `Implement the \`getByHash\` query for the service_tokens table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-tokens/update-approval",
      systemPrompt: `Implement the \`updateApproval\` query for the service_tokens table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-tokens/update-usage",
      systemPrompt: `Implement the \`updateUsage\` query for the service_tokens table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/service-tokens/list",
      systemPrompt: `Implement the \`list\` query for the service_tokens table.`,
    })),

    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "schemas/access-requests.ts",
      systemPrompt: `Add the access_requests table:

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
      path: "queries/access-requests/create",
      systemPrompt: `Implement the \`create\` query for the access_requests table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-requests/get-by-id",
      systemPrompt: `Implement the \`getById\` query for the access_requests table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-requests/update-status",
      systemPrompt: `Implement the \`updateStatus\` query for the access_requests table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-requests/update-usage",
      systemPrompt: `Implement the \`updateUsage\` query for the access_requests table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-requests/list-pending",
      systemPrompt: `Implement the \`listPending\` query for the access_requests table.`,
    })),

    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/access-requests/list-by-service",
      systemPrompt: `Implement the \`listByService\` query for the access_requests table.`,
    })),
  ],
});

export default ImplementSecretsDbWorkflowDefinition;
