import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CdStepMachine,
} from "@saflib/workflows";
import path from "path";
import {
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcServerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  AddGrpcCallWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
} from "@saflib/grpc/workflows";

const input = [] as const;

interface ImplementSecretsGrpcServerContext {}

export const ImplementSecretsGrpcServerWorkflowDefinition = defineWorkflow<
  typeof input,
  ImplementSecretsGrpcServerContext
>({
  id: "secrets/implement-grpc",
  description: "Implement the gRPC server for the secrets service",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "spec.md"),
  },

  steps: [
    step(makeWorkflowMachine(InitGrpcProtoWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-proto",
      path: "./secrets/secrets-grpc-proto",
    })),
    step(CdStepMachine, () => ({
      path: "./secrets/secrets-grpc-proto",
    })),
    step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
      path: "./protos/secrets/get-secret.proto",
      systemPrompt: `Given a token, a service name, and a secret name, return the secret value if the secret exists and the token is valid. The response should indicate if the token is available or not.`,
    })),
    step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
      path: "./protos/secrets/register-token.proto",
      systemPrompt: `Given a token and a secret name, register the token for the secret. The response should indicate if the token was registered successfully.`,
    })),
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitGrpcServerWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-server",
      path: "./secrets/secrets-grpc-server",
    })),
    step(CdStepMachine, () => ({
      path: "./secrets/secrets-grpc-server",
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./handlers/secrets/get-secret.ts",
      systemPrompt: `Implement the GetSecret gRPC handler. It should validate the token and return a reasonable response.`,
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./handlers/secrets/register-token.ts",
      systemPrompt: `Implement the RegisterToken gRPC handler.`,
    })),
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitGrpcClientWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-client",
      path: "./secrets/secrets-grpc-client",
    })),
    step(CdStepMachine, () => ({
      path: "./secrets/secrets-grpc-client",
    })),
    step(makeWorkflowMachine(AddGrpcCallWorkflowDefinition), () => ({
      path: "./rpcs/secrets/get-secret.ts",
      systemPrompt: `The fake implementation should always return a successful response.`,
    })),
    step(makeWorkflowMachine(AddGrpcCallWorkflowDefinition), () => ({
      path: "./rpcs/secrets/register-token.ts",
      systemPrompt: `The fake implementation should always return a successful response.`,
    })),
  ],
});

export default ImplementSecretsGrpcServerWorkflowDefinition;
