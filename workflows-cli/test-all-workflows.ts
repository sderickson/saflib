import { defineWorkflow, makeWorkflowMachine, step } from "@saflib/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import { CdStepMachine } from "@saflib/workflows";
import {
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
} from "@saflib/openapi/workflows";
import {
  UpdateSchemaWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
} from "@saflib/drizzle/workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express/workflows";
import { AddEmailTemplateWorkflowDefinition } from "@saflib/email/workflows";
import { AddEnvVarWorkflowDefinition } from "@saflib/env/workflows";
import {
  AddExportWorkflowDefinition,
  AddTsPackageWorkflowDefinition,
} from "@saflib/monorepo/workflows";
import {
  AddCLIWorkflowDefinition,
  AddCommandWorkflowDefinition,
} from "@saflib/commander/workflows";
import {
  InitGrpcProtoWorkflowDefinition,
  InitGrpcServerWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
  // AddGrpcServerHandlerWorkflowDefinition,
  // AddGrpcCallWorkflowDefinition,
  // AddProtoWorkflowDefinition,
} from "@saflib/grpc/workflows";
import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";
import {
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
} from "@saflib/cron/workflows";
import {
  AddComponentWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
} from "@saflib/sdk/workflows";
import {
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
} from "@saflib/vue/workflows";
import { AddWorkflowDefinition } from "@saflib/workflows/workflows";
import { SpecProjectWorkflowDefinition } from "@saflib/processes/workflows";

const input = [] as const;
interface TestAllWorkflowsContext {}

/**
 * A workflow that incorporates every generic workflow in the repo.
 * It makes sure there are at least no logical errors preventing workflows from running,
 * and that workflows that depend on one another are working correctly.
 *
 * Usage:
 * npm exec saf-workflow run-scripts ./test-all-workflows.ts
 *
 * It also runs as part of github actions on PRs.
 */
export const TestAllWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestAllWorkflowsContext
>({
  id: "saflib/test-all-workflows",
  description: "Run all @saflib workflows.",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(makeWorkflowMachine(SpecProjectWorkflowDefinition), () => ({
      name: "example-project",
    })),

    // Covers various "init" workflows
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), () => ({
      name: "@saflib/tmp-service",
      path: "./tmp/service",
    })),

    // Test "@saflib/openapi workflows"
    step(CdStepMachine, () => ({
      path: "./tmp/service/spec",
    })),
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "user",
    })),
    // Route template references schemas/todo.yaml; add it so saf-specs generate succeeds in script mode
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "todo",
    })),
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/users/list.yaml",
      urlPath: "/users",
      method: "get",
    })),
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/users/create.yaml",
      urlPath: "/users",
      method: "post",
    })),
    step(makeWorkflowMachine(AddEventWorkflowDefinition), () => ({
      path: "./events/signup.yaml",
    })),

    // Test @saflib/drizzle workflows
    step(CdStepMachine, () => ({
      path: "./tmp/service/db",
    })),
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "./schemas/users.ts",
    })),
    step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
      path: "./queries/users/list.ts",
    })),

    // Test @saflib/express workflows
    step(CdStepMachine, () => ({
      path: "./tmp/service/http",
    })),
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/users/list.ts",
    })),

    // Test misc workflows
    step(makeWorkflowMachine(AddEmailTemplateWorkflowDefinition), () => ({
      path: "./emails/welcome.ts",
    })),
    step(makeWorkflowMachine(AddEnvVarWorkflowDefinition), () => ({
      name: "API_KEY",
    })),

    // Test making a package with export and CLI
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(AddTsPackageWorkflowDefinition), () => ({
      name: "tmp-lib",
      path: "./tmp/service/lib",
    })),
    step(CdStepMachine, () => ({
      path: "./tmp/service/lib",
    })),
    step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
      name: "workflows/add-foo",
    })),
    step(makeWorkflowMachine(AddExportWorkflowDefinition), () => ({
      name: "myFunction",
      path: "./src/utils.ts",
    })),
    step(makeWorkflowMachine(AddCLIWorkflowDefinition), () => ({
      name: "tmp-cli",
    })),
    step(makeWorkflowMachine(AddCommandWorkflowDefinition), () => ({
      path: "./bin/tmp-cli/echo.ts",
    })),

    // Test @saflib/grpc workflows
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitGrpcProtoWorkflowDefinition), () => ({
      name: "@saflib/tmp-grpc-proto",
      path: "./tmp/service/grpc-proto",
    })),
    step(makeWorkflowMachine(InitGrpcServerWorkflowDefinition), () => ({
      name: "@saflib/tmp-grpc-server",
      path: "./tmp/service/grpc-server",
    })),
    step(makeWorkflowMachine(InitGrpcClientWorkflowDefinition), () => ({
      name: "@saflib/tmp-grpc-client",
      path: "./tmp/service/grpc-client",
    })),
    step(CdStepMachine, () => ({
      path: "./tmp/service/grpc-proto",
    })),

    // NOTE: It has to be in the health group for types, and this test, to work.
    // TODO: Refactor grpc to use inline templates, it'll be better
    // step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
    //   path: "./protos/health/example.proto",
    // })),
    // step(CdStepMachine, () => ({
    //   path: "./tmp/service/grpc-server",
    // })),
    // step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
    //   path: "./handlers/health/example.ts",
    // })),
    // step(CdStepMachine, () => ({
    //   path: "./tmp/service/grpc-client",
    // })),
    // step(makeWorkflowMachine(AddGrpcCallWorkflowDefinition), () => ({
    //   path: "./rpcs/health/example.ts",
    // })),

    // Test @saflib/identity workflows
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(IdentityInitWorkflowDefinition), () => ({
      name: "@saflib/tmp-identity",
      path: "./tmp/service/identity",
    })),

    // Test @saflib/cron workflows
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(CronInitWorkflowDefinition), () => ({
      name: "@saflib/tmp-cron",
      path: "./tmp/service/cron",
    })),
    step(CdStepMachine, () => ({
      path: "./tmp/service/cron",
    })),
    step(makeWorkflowMachine(CronAddJobWorkflowDefinition), () => ({
      path: "./jobs/tmp-cron/give-time.ts",
    })),

    // Test @saflib/sdk workflows
    step(CdStepMachine, () => ({
      path: "./tmp/service/sdk",
    })),
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/users/list.ts",
    })),
    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./components/user-list",
    })),
    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "./requests/users/create.ts",
    })),

    // Test @saflib/vue workflows
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), () => ({
      productName: "tmp",
      subdomainName: "root",
    })),
    step(CdStepMachine, () => ({
      path: "./tmp/clients/root",
    })),
    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), () => ({
      path: "./pages/welcome-new-user",
      urlPath: "/welcome-new-user",
    })),
  ],
});

export default TestAllWorkflowsDefinition;
