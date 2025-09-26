import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import path from "path";
import {
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcServerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  InitClientWorkflowDefinition,
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

  // afterEach: () => {
  //   execSync("git add -A");
  // },

  steps: [
    step(makeWorkflowMachine(InitGrpcProtoWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-proto",
      path: "./secrets/secrets-grpc-proto",
    })),
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-grpc-proto",
    })),
    step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
      path: "./protos/secrets/get-secret.proto",
    })),
    step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
      path: "./protos/secrets/register-token.proto",
    })),
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitGrpcServerWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-server",
      path: "./secrets/secrets-grpc-server",
    })),
    step(CwdStepMachine, () => ({
      path: "./secrets/secrets-grpc-server",
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./handlers/secrets/get-secret.ts",
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./handlers/secrets/register-token.ts",
    })),
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitClientWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-client",
      path: "./secrets/secrets-grpc-client",
    })),
  ],
});

export default ImplementSecretsGrpcServerWorkflowDefinition;
