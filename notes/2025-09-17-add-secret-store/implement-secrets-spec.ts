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
      systemPrompt: `The Secret schema has the following properties:

      - id: string (UUID)
      - name: string (unique secret name)
      - description: string (optional description)
      - masked_value: string (masked value for admin display, shows as "***")
      - created_at: number (timestamp)
      - updated_at: number (timestamp)
      - is_active: boolean (whether the secret is active)`,
    })),

    // SecretCreateRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "secret-create-request",
      systemPrompt: `The SecretCreateRequest schema has the following properties:

      - name: string (required, unique secret name)
      - description: string (optional description)
      - value: string (required, the actual secret value to be encrypted)`,
    })),

    // SecretUpdateRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "secret-update-request",
      systemPrompt: `The SecretUpdateRequest schema has the following properties:

      - description: string (optional, updated description)
      - value: string (optional, new secret value to be encrypted)
      - is_active: boolean (optional, whether to activate/deactivate the secret)`,
    })),

    // GET /secrets route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/list",
      systemPrompt: `The GET /secrets endpoint has the following requirements:

      - Returns array of Secret objects
      - Include pagination parameters (limit, offset)
      - Include filtering by is_active status
      - Include sorting options (created_at, updated_at, name)
      - Return 200 with array of secrets
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Use error.yaml for error responses`,
    })),

    // POST /secrets route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/create",
      systemPrompt: `The POST /secrets endpoint has the following requirements:

      - Accepts SecretCreateRequest in request body
      - Validates that secret name is unique
      - Encrypts the secret value before storing
      - Returns created Secret object (with masked value)
      - Return 201 with created secret
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Use error.yaml for error responses`,
    })),

    // PUT /secrets/:id route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/update",
      systemPrompt: `The PUT /secrets/:id endpoint has the following requirements:

      - Accepts secret ID as path parameter
      - Accepts SecretUpdateRequest in request body
      - Updates only provided fields
      - Re-encrypts value if provided
      - Returns updated Secret object (with masked value)
      - Return 200 with updated secret
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if secret not found
      - Use error.yaml for error responses`,
    })),

    // DELETE /secrets/:id route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "secrets/delete",
      systemPrompt: `The DELETE /secrets/:id endpoint has the following requirements:

      - Accepts secret ID as path parameter
      - Soft delete by setting is_active to false (don't actually delete)
      - Returns success message
      - Return 200 with success message
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if secret not found
      - Use error.yaml for error responses`,
    })),

    // ServiceToken Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "service-token",
      systemPrompt: `The ServiceToken schema has the following properties:

      - id: string (UUID)
      - service_name: string (name of the service)
      - token_hash: string (SHA-256 hash of the token - truncated for admin display)
      - service_version: string (optional version of the service)
      - requested_at: number (timestamp when token was requested)
      - approved: boolean (whether the token is approved)
      - approved_at: number (timestamp when approved, null if not approved)
      - approved_by: string (user who approved the token, null if not approved)
      - last_used_at: number (timestamp of last usage, null if never used)
      - access_count: number (number of times the token has been used)`,
    })),

    // AccessRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "access-request",
      systemPrompt: `The AccessRequest schema has the following properties:

      - id: string (UUID)
      - secret_id: string (ID of the secret being requested)
      - secret_name: string (name of the secret for display purposes)
      - service_name: string (name of the service requesting access)
      - requested_at: number (timestamp when access was requested)
      - status: string (enum: 'pending', 'granted', 'denied')
      - granted_at: number (timestamp when granted, null if not granted)
      - granted_by: string (user who granted access, null if not granted)
      - access_count: number (number of times access has been used)
      - last_accessed_at: number (timestamp of last access, null if never accessed)`,
    })),

    // ApprovalRequest Schema
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "approval-request",
      systemPrompt: `The ApprovalRequest schema has the following properties:

      - approved: boolean (true to approve, false to deny)
      - approved_by: string (user making the approval decision)
      - reason: string (optional reason for approval/denial)`,
    })),

    // GET /access-requests route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "access-requests/list",
      systemPrompt: `The GET /access-requests endpoint has the following requirements:

      - Returns array of AccessRequest objects
      - Include filtering by status (pending, granted, denied)
      - Include filtering by service_name
      - Include pagination parameters (limit, offset)
      - Include sorting options (requested_at, status)
      - Return 200 with array of access requests
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Use error.yaml for error responses`,
    })),

    // POST /access-requests/:id/approve route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "access-requests/approve",
      systemPrompt: `The POST /access-requests/:id/approve endpoint has the following requirements:

      - Accepts access request ID as path parameter
      - Accepts ApprovalRequest in request body
      - Updates access request status to 'granted' or 'denied'
      - Records approval details (approved_by, granted_at)
      - Returns updated AccessRequest object
      - Return 200 with updated access request
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if access request not found
      - Use error.yaml for error responses`,
    })),

    // GET /service-tokens route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "service-tokens/list",
      systemPrompt: `The GET /service-tokens endpoint has the following requirements:

      - Returns array of ServiceToken objects
      - Include filtering by approved status
      - Include filtering by service_name
      - Include pagination parameters (limit, offset)
      - Include sorting options (requested_at, approved, service_name)
      - Return 200 with array of service tokens
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Use error.yaml for error responses`,
    })),

    // POST /service-tokens/:id/approve route
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "service-tokens/approve",
      systemPrompt: `The POST /service-tokens/:id/approve endpoint has the following requirements:

      - Accepts service token ID as path parameter
      - Accepts ApprovalRequest in request body
      - Updates service token approval status
      - Records approval details (approved_by, approved_at)
      - Returns updated ServiceToken object
      - Return 200 with updated service token
      - Return 401 if not authenticated
      - Return 403 if not authorized (admin only)
      - Return 404 if service token not found
      - Use error.yaml for error responses`,
    })),
  ],
});

export default ImplementSecretsSpecWorkflowDefinition;
