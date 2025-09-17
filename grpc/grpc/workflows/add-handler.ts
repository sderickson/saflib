import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The path to the gRPC service package (e.g., 'grpc/secrets-grpc')",
    exampleValue: "grpc/secrets-grpc",
  },
] as const;

interface AddHandlerWorkflowContext {
  name: string; // e.g. "get-secret"
  camelName: string; // e.g. getSecret
  targetDir: string;
  serviceName: string; // e.g. "secrets"
  indexPath: string; // e.g. "/rpcs/secrets/index.ts"
  pascalServiceName: string; // e.g. "Secrets"
  grpcPath: string; // e.g. "/grpc.ts"
}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "grpc/add-handler",

  description: "Add gRPC handler implementations",

  checklistDescription: ({ name }) => `Add gRPC handler ${name}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.dirname(path.join(input.cwd, input.path));
    const [rpcName, serviceName, methodName] = input.path.split("/");
    if (rpcName !== "rpcs") {
      throw new Error(
        "Path should be of the form rpcs/{service-name}/{method-name}.ts",
      );
    }

    const cwd = input.cwd;
    const indexPath = path.join(targetDir, "index.ts").replace(cwd, "");
    const pascalServiceName = kebabCaseToPascalCase(serviceName);
    const grpcPath = path.join(cwd, "grpc.ts").replace(cwd, "");
    const name = methodName.split(".")[0];

    return {
      name,
      camelName: kebabCaseToCamelCase(name),
      targetDir,
      serviceName,
      indexPath,
      pascalServiceName,
      grpcPath,
    };
  },

  templateFiles: {
    handler: path.join(sourceDir, "template-file.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line
          .replace("templateService", context.serviceName + "Service")
          .replace("TemplateService", context.pascalServiceName + "Service"),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.camelName} gRPC handler. Make sure to:
        1. Use proper gRPC types from your proto package
        2. Handle expected errors from service/DB layers
        3. Let unexpected errors propagate to central error handler (no try/catch)
        4. Export the handler from the folder's "index.ts" file`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the main grpc.ts file to register the ${context.serviceName} service if it's not already there.
        1. Import the handler: \`import { ${context.pascalServiceName}Service } from "./rpcs/${context.serviceName}/index.ts"\`
        2. Add the service to the server: \`server.addService(${context.pascalServiceName}Service.definition, ...)\`
        3. Make sure to use the proper context wrapper, something like this:
        
        server.addService(
          ${context.pascalServiceName}Service.definition,
          addSafContext(
            addStoreContext(new ${context.pascalServiceName}Service()),
            ${context.pascalServiceName}ServiceDefinition,
          ),
        );`,
    })),
  ],
});
