import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import {
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
} from "@saflib/openapi/workflows";
import path from "path";
import { execSync } from "child_process";

const input = [] as const;

interface ImplementSecretsSpecContext {}

export const ImplementSecretsSpecWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsSpecContext
>({
  id: "secrets/implement-spec",
  description: "Implement the OpenAPI specifications for the secrets service",
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
      path: "./secrets/secrets-spec",
    })),

    // Secret Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "secret",
      systemPrompt: `Create a Secret schema based on the database table definition:

      Fields to include:
      - id: string (UUID)
      - name: string (unique secret name)
      - description: string (optional description)
      - masked_value: string (base64 encoded encrypted value - for admin display, show as masked)
      - created_at: number (timestamp)
      - updated_at: number (timestamp)
      - created_by: string (user who created the secret)
      - is_active: boolean (whether the secret is active)

      For the masked_value field, consider that this will be displayed in admin interfaces as masked (e.g., "***") for security.`,
    })),

    // SecretCreateRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "secret-create-request",
      systemPrompt: `Create a SecretCreateRequest schema for creating new secrets:

      Fields to include:
      - name: string (required, unique secret name)
      - description: string (optional description)
      - value: string (required, the actual secret value to be encrypted)
      - created_by: string (required, user creating the secret)

      This schema is used for POST /secrets endpoint.`,
    })),

    // SecretUpdateRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "secret-update-request",
      systemPrompt: `Create a SecretUpdateRequest schema for updating existing secrets:

      Fields to include:
      - description: string (optional, updated description)
      - value: string (optional, new secret value to be encrypted)
      - is_active: boolean (optional, whether to activate/deactivate the secret)

      This schema is used for PUT /secrets/:id endpoint.`,
    })),

    // ServiceToken Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "service-token",
      systemPrompt: `Create a ServiceToken schema based on the database table definition:

      Fields to include:
      - id: string (UUID)
      - service_name: string (name of the service)
      - token_hash: string (SHA-256 hash of the token - for admin display)
      - service_version: string (optional version of the service)
      - requested_at: number (timestamp when token was requested)
      - approved: boolean (whether the token is approved)
      - approved_at: number (timestamp when approved, null if not approved)
      - approved_by: string (user who approved the token, null if not approved)
      - last_used_at: number (timestamp of last usage, null if never used)
      - access_count: number (number of times the token has been used)

      For the token_hash field, consider that this will be displayed in admin interfaces as a truncated hash for security.`,
    })),

    // AccessRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "access-request",
      systemPrompt: `Create an AccessRequest schema based on the database table definition:

      Fields to include:
      - id: string (UUID)
      - secret_id: string (ID of the secret being requested)
      - secret_name: string (name of the secret for display purposes)
      - service_name: string (name of the service requesting access)
      - requested_at: number (timestamp when access was requested)
      - status: string (enum: 'pending', 'granted', 'denied')
      - granted_at: number (timestamp when granted, null if not granted)
      - granted_by: string (user who granted access, null if not granted)
      - access_count: number (number of times access has been used)
      - last_accessed_at: number (timestamp of last access, null if never accessed)

      Include the secret_name field for easier display in admin interfaces.`,
    })),

    // ApprovalRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "approval-request",
      systemPrompt: `Create an ApprovalRequest schema for approving/denying requests:

      Fields to include:
      - approved: boolean (true to approve, false to deny)
      - approved_by: string (user making the approval decision)
      - reason: string (optional reason for approval/denial)

      This schema is used for POST /access-requests/:id/approve and POST /service-tokens/:id/approve endpoints.`,
    })),

    // Error Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "error",
      systemPrompt: `Create an Error schema for error responses:

      Fields to include:
      - error: string (error code or type)
      - message: string (human-readable error message)
      - details: object (optional additional error details)

      This schema is used for all error responses (400, 401, 403, 404, 500).`,
    })),

    // GET /secrets route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/list",
      systemPrompt: `Create a GET /secrets route for listing all secrets:

      - Returns array of Secret objects
      - Values should be masked for security (show as "***")
      - Include pagination parameters (limit, offset)
      - Include filtering by is_active status
      - Include sorting options (created_at, updated_at, name)
      - Return 200 with array of secrets
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)`,
    })),

    // POST /secrets route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/create",
      systemPrompt: `Create a POST /secrets route for creating new secrets:

      - Accepts SecretCreateRequest in request body
      - Validates that secret name is unique
      - Encrypts the secret value before storing
      - Returns created Secret object (with masked value)
      - Return 201 with created secret
      - Return 400 for validation errors (duplicate name, missing required fields)
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)`,
    })),

    // PUT /secrets/:id route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/update",
      systemPrompt: `Create a PUT /secrets/:id route for updating existing secrets:

      - Accepts secret ID as path parameter
      - Accepts SecretUpdateRequest in request body
      - Updates only provided fields
      - Re-encrypts value if provided
      - Returns updated Secret object (with masked value)
      - Return 200 with updated secret
      - Return 400 for validation errors
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if secret not found`,
    })),

    // DELETE /secrets/:id route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/delete",
      systemPrompt: `Create a DELETE /secrets/:id route for deleting secrets:

      - Accepts secret ID as path parameter
      - Soft delete by setting is_active to false (don't actually delete)
      - Returns success message
      - Return 200 with success message
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if secret not found`,
    })),

    // GET /access-requests route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "access-requests/list",
      systemPrompt: `Create a GET /access-requests route for listing access requests:

      - Returns array of AccessRequest objects
      - Include filtering by status (pending, granted, denied)
      - Include filtering by service_name
      - Include pagination parameters (limit, offset)
      - Include sorting options (requested_at, status)
      - Return 200 with array of access requests
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)`,
    })),

    // POST /access-requests/:id/approve route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "access-requests/approve",
      systemPrompt: `Create a POST /access-requests/:id/approve route for approving access requests:

      - Accepts access request ID as path parameter
      - Accepts ApprovalRequest in request body
      - Updates access request status to 'granted' or 'denied'
      - Records approval details (approved_by, granted_at)
      - Returns updated AccessRequest object
      - Return 200 with updated access request
      - Return 400 for validation errors
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if access request not found`,
    })),

    // GET /service-tokens route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "service-tokens/list",
      systemPrompt: `Create a GET /service-tokens route for listing service tokens:

      - Returns array of ServiceToken objects
      - Include filtering by approved status
      - Include filtering by service_name
      - Include pagination parameters (limit, offset)
      - Include sorting options (requested_at, approved, service_name)
      - Return 200 with array of service tokens
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)`,
    })),

    // POST /service-tokens/:id/approve route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "service-tokens/approve",
      systemPrompt: `Create a POST /service-tokens/:id/approve route for approving service tokens:

      - Accepts service token ID as path parameter
      - Accepts ApprovalRequest in request body
      - Updates service token approval status
      - Records approval details (approved_by, approved_at)
      - Returns updated ServiceToken object
      - Return 200 with updated service token
      - Return 400 for validation errors
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if service token not found`,
    })),
  ],
});

export default ImplementSecretsSpecWorkflowDefinition;
