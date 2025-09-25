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
import {
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcServerWorkflowDefinition,
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

  afterEach: () => {
    execSync("git add -A");
  },

  steps: [
    step(makeWorkflowMachine(InitGrpcServerWorkflowDefinition), () => ({
      name: "@saflib/secrets-grpc-server",
      path: "./secrets/secrets-grpc-server",
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./secrets/secrets-grpc-server",
      name: "get-secret",
    })),
  ],
});

export default ImplementSecretsGrpcServerWorkflowDefinition;
