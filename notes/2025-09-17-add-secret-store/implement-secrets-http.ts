import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CdStepMachine,
  PromptStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express/workflows";
import path from "path";

const input = [] as const;

interface ImplementSecretsHttpContext {}

export const ImplementSecretsHttpWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsHttpContext
>({
  id: "secrets/implement-http",
  description: "Implement the HTTP API layer for the secrets service",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "spec.md"),
  },

  steps: [
    step(CdStepMachine, () => ({
      path: "./secrets/secrets-http",
    })),

    // Create encryption helper functions
    step(PromptStepMachine, () => ({
      promptText: `Create a file at lib/encryption.ts with the following encryption helper functions:

1. upsertSecretEncryptionKey(): string
   - Check if data/encryption-key.txt exists
   - If NODE_ENV is "test", return a hardcoded test key for consistency
   - If file doesn't exist, generate a new 32-byte random key (crypto.randomBytes(32).toString('hex'))
   - Store the key in data/encryption-key.txt
   - Return the key as a string
   - Use fs.mkdirSync with recursive: true to ensure data directory exists

2. encryptSecret(key: string, value: string): string
   - Use Node.js crypto module with AES-256-GCM
   - Generate random IV for each encryption
   - Return base64 encoded result that includes IV + authTag + encrypted data
   - Handle the key as hex string

3. decryptSecret(key: string, encryptedValue: string): string
   - Decode the base64 encrypted value
   - Extract IV, authTag, and encrypted data
   - Use AES-256-GCM to decrypt
   - Return the original plaintext value
   - Handle the key as hex string

Make sure to handle errors appropriately and add proper TypeScript types.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Create tests for the encryption functions at lib/encryption.test.ts:

1. Test upsertSecretEncryptionKey():
   - Should return consistent key in test environment
   - Should create and return new key if file doesn't exist
   - Should return existing key if file exists

2. Test encryptSecret() and decryptSecret():
   - Should encrypt and decrypt successfully
   - Should produce different encrypted values for same input (due to random IV)
   - Should throw error on invalid encrypted data
   - Should throw error on wrong key

3. Integration test:
   - Encrypt a value, then decrypt it, should get original value back`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    // Create secrets routes
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/secrets/list",
      systemPrompt: `This handler implements GET /secrets endpoint. Use these database queries:
      
      - Import listSecrets query from @secrets/secrets-db
      - Support pagination (limit, offset) and filtering (is_active)
      - Support sorting (created_at, updated_at, name)
      - Return secrets with masked values (use "***" for value display)
      - Use decryptSecret helper to decrypt values if needed for processing
      - Ensure proper error handling and admin-only access`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/secrets/create",
      systemPrompt: `This handler implements POST /secrets endpoint. Use these database queries:
      
      - Import createSecret query from @secrets/secrets-db
      - Import getSecretByName query to check for duplicates
      - Use encryptSecret helper to encrypt the secret value before storing
      - Use upsertSecretEncryptionKey to get the encryption key
      - Validate that secret name is unique
      - Return created secret with masked value
      - Ensure proper error handling and admin-only access`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/secrets/update",
      systemPrompt: `This handler implements PUT /secrets/:id endpoint. Use these database queries:
      
      - Import updateSecret and getSecretById queries from @secrets/secrets-db
      - Use encryptSecret helper if value is being updated
      - Use upsertSecretEncryptionKey to get the encryption key
      - Update only provided fields (partial update)
      - Return updated secret with masked value
      - Ensure proper error handling and admin-only access`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/secrets/delete",
      systemPrompt: `This handler implements DELETE /secrets/:id endpoint. Use these database queries:
      
      - Import removeSecret and getSecretById queries from @secrets/secrets-db
      - Perform soft delete by setting is_active to false
      - Return success message
      - Ensure proper error handling and admin-only access`,
    })),

    // Create access-requests routes
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/access-requests/list",
      systemPrompt: `This handler implements GET /access-requests endpoint. Use these database queries:
      
      - Import listPendingAccessRequests and listAccessRequestsByService queries from @secrets/secrets-db
      - Support filtering by status (pending, granted, denied) and service_name
      - Support pagination (limit, offset) and sorting (requested_at, status)
      - Return array of access request objects
      - Ensure proper error handling and admin-only access`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/access-requests/approve",
      systemPrompt: `This handler implements POST /access-requests/:id/approve endpoint. Use these database queries:
      
      - Import updateAccessRequestStatus and getAccessRequestById queries from @secrets/secrets-db
      - Accept ApprovalRequest in request body (approved: boolean, reason?: string)
      - Update access request status to 'granted' or 'denied'
      - Record approval details (approved_by (email/id gotten from auth), granted_at)
      - Return updated access request object
      - Ensure proper error handling and admin-only access`,
    })),

    // Create service-tokens routes
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/service-tokens/list",
      systemPrompt: `This handler implements GET /service-tokens endpoint. Use these database queries:
      
      - Import listServiceTokens query from @secrets/secrets-db
      - Support filtering by approved status and service_name
      - Support pagination (limit, offset) and sorting (requested_at, approved, service_name)
      - Return service tokens with truncated token_hash for security
      - Ensure proper error handling and admin-only access`,
    })),

    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/service-tokens/approve",
      systemPrompt: `This handler implements POST /service-tokens/:id/approve endpoint. Use these database queries:
      
      - Import updateServiceTokenApproval and getServiceTokenByHash queries from @secrets/secrets-db
      - Accept ApprovalRequest in request body (approved: boolean, reason?: string)
      - Update service token approval status
      - Record approval details (approved_by (email/id gotten from auth), approved_at)
      - Return updated service token object
      - Ensure proper error handling and admin-only access`,
    })),
  ],
});

export default ImplementSecretsHttpWorkflowDefinition;
