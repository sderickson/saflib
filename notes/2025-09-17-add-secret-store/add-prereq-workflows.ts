import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CdStepMachine,
} from "@saflib/workflows";
import { AddWorkflowDefinition } from "@saflib/workflows/workflows";
import path from "node:path";

const input = [] as const;

interface AddPrereqWorkflowsContext {}

const AddPrereqWorkflowsDefinition = defineWorkflow<
  typeof input,
  AddPrereqWorkflowsContext
>({
  id: "secrets/add-prereq-workflows",
  description:
    "Add all prerequisite workflows needed for the secrets service project",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "./spec.md"),
  },
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `This workflow will add all the prerequisite workflows needed for the secrets service project.

      Workflows are an experimental tool, and so there are several created, but there are also many missing.

The workflows we need to add are:
1. monorepo/add-export - Add new exports (functions, classes, interfaces) to packages
2. protos/init - Create protocol buffer packages
3. protos/add-method - Add new gRPC methods to proto files
4. grpc/init - Create gRPC service packages
5. grpc/add-handler - Add gRPC handler implementations
6. sdk/add-form - Add form components to SDK packages
7. sdk/add-display - Add display components to SDK packages
8. sdk/add-query - Add TanStack queries to SDK packages
9. monorepo/add-doc - Add documentation to packages

These are all generic workflows that will be useful beyond just the secrets project.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `First, we will add the monorepo/add-export workflow. This workflow should:
- Take inputs: name, path
- Copy/update a test file based on the name
- Add implementation
- Add tests
- Add the export to index.ts
- Update documentation (npm exec saf-docs generate)

This is the most fundamental workflow for free-form packages like env and secrets.`,
    })),

    step(CdStepMachine, () => ({
      path: "./monorepo",
    })),

    // Add monorepo/add-export workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "monorepo/add-export",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the protos/init workflow. This workflow should:
- Take inputs: name, path
- Create a new protocol buffer package (similar to saflib/identity/identity-rpcs)
- Run protobuf generation (npm run generate)

See other "init" workflows for examples. It should be fully automatic (no prompts).

This will be used to create @saflib/secrets-proto.`,
    })),

    step(CdStepMachine, () => ({
      path: "./grpc/grpc-specs",
    })),

    // Add protos/init workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "protos/init",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the protos/add-method workflow. This workflow should:
- Take inputs: path (to the proto service file)
- Add the prompted method to the proto file (not provided as an input)
- Regenerate from proto (npm run generate)

This will be used to add GetSecret, RegisterToken, etc. to the secrets proto.`,
    })),

    // Add protos/add-method workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "protos/add-method",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the grpc/init workflow. This workflow should:
- Take inputs: name, path
- Create a new gRPC service package (similar to saflib/identity/identity-grpc)

See other "init" workflows for examples. It should be fully automatic (no prompts).

This will be used to create @saflib/secrets-grpc.`,
    })),

    step(CdStepMachine, () => ({
      path: "./grpc/grpc",
    })),

    // Add grpc/init workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "grpc/init",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the grpc/add-handler workflow. This workflow should:
- Take inputs: path
- Add the handler to the gRPC service from template
- Implement the handler
- Add tests

This will be used to implement GetSecret, RegisterToken handlers.`,
    })),

    // Add grpc/add-handler workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "grpc/add-handler",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the sdk/add-form workflow. This workflow should:
- Take inputs: name
- Create from template:Vue form component, strings, and test files (similar to vue/add-page but no loader or async component files)
- Implement the component, adding strings as necessary
- Add tests

This will be used to create SecretForm.vue.`,
    })),

    step(CdStepMachine, () => ({
      path: "./sdk",
    })),

    // Add sdk/add-form workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "sdk/add-form",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the sdk/add-display workflow. This workflow should:
- Take inputs: name
- Create from template:Vue display component, strings, and test files (similar to vue/add-page but no loader or async component files)
- Implement the component, adding strings as necessary
- Add tests

This will be used to create SecretsTable.vue, PendingApprovalsTable.vue, etc.`,
    })),

    // Add sdk/add-display workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "sdk/add-display",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Next, we will add the sdk/add-query workflow. This workflow should:
- Take inputs: path
- Create TanStack Query hook and test from template
- Implement the hook
- Add tests

This will be used to create queries for secrets API endpoints.`,
    })),

    // Add sdk/add-query workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "sdk/add-query",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Finally, we will add the monorepo/add-doc workflow. This workflow should:
- Take inputs: path
- Create documentation file from template
- Prompt *the person* (not the agent!) to fill in the docs

This will be used to add documentation for the secrets service.`,
    })),

    step(CdStepMachine, () => ({
      path: "./monorepo",
    })),

    // Add monorepo/add-doc workflow
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "monorepo/add-doc",
    })),
  ],
});

export default AddPrereqWorkflowsDefinition;
