import { defineWorkflow, makeWorkflowMachine, step } from "@saflib/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import { CwdStepMachine } from "@saflib/workflows";
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
  AddGrpcServerHandlerWorkflowDefinition,
  AddGrpcCallWorkflowDefinition,
  AddProtoWorkflowDefinition,
} from "@saflib/grpc/workflows";
import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";
import {
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
} from "@saflib/cron/workflows";
import {
  AddComponentWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
} from "@saflib/sdk/workflows";
import { AddSpaPageWorkflowDefinition, AddSpaWorkflowDefinition } from "@saflib/vue/workflows";
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

    // step(makeWorkflowMachine(SpecProjectWorkflowDefinition), () => ({
    //   name: "example-project",
    // })),  

    // // Covers various "init" workflows
    // step(makeWorkflowMachine(InitServiceWorkflowDefinition), () => ({
    //   name: "tmp-service",
    //   path: "./services/tmp",
    // })),
    
    // // Test "@saflib/openapi workflows"
    // step(CwdStepMachine, () => ({
    //   path: "./services/tmp/tmp-spec",
    // })),
    // step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
    //   name: "user",
    // })),
    // step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
    //   path: "./routes/users/list.yaml",
    // })),
    // step(makeWorkflowMachine(AddEventWorkflowDefinition), () => ({
    //   path: "./events/signup.yaml",
    // })),

    // // Test @saflib/drizzle workflows
    // step(CwdStepMachine, () => ({
    //   path: "./services/tmp/tmp-db",
    // })),
    // step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
    //   path: "./schemas/users.ts",
    // })),
    // step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
    //   path: "./queries/users/list.ts",
    // })),

    // // Test @saflib/express workflows
    // step(CwdStepMachine, () => ({
    //   path: "./services/tmp/tmp-http",
    // })),
    // step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
    //   path: "./routes/users/list.ts",
    // })),

    // // Test misc workflows
    // step(makeWorkflowMachine(AddEmailTemplateWorkflowDefinition), () => ({
    //   path: "./emails/welcome.ts",
    // })),
    // step(makeWorkflowMachine(AddEnvVarWorkflowDefinition), () => ({
    //   name: "API_KEY",
    // })),

    // Test making a package with export and CLI
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(AddTsPackageWorkflowDefinition), () => ({
      name: "tmp-lib",
      path: "./services/tmp/tmp-lib",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-lib",
    })),
    // step(makeWorkflowMachine(AddWorkflowDefinition), () => ({
    //   name: "workflows/add-foo",
    // })),
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
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(InitGrpcProtoWorkflowDefinition), () => ({
      name: "tmp-grpc-proto",
      path: "./services/tmp/tmp-grpc-proto",
    })),
    step(makeWorkflowMachine(InitGrpcServerWorkflowDefinition), () => ({
      name: "tmp-grpc-server",
      path: "./services/tmp/tmp-grpc-server",
    })),
    step(makeWorkflowMachine(InitGrpcClientWorkflowDefinition), () => ({
      name: "tmp-grpc-client",
      path: "./services/tmp/tmp-grpc-client",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-grpc-proto",
    })),

    // NOTE: It has to be in the health group for types, and this test, to work.
    step(makeWorkflowMachine(AddProtoWorkflowDefinition), () => ({
      path: "./protos/health/example.proto",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-grpc-server",
    })),
    step(makeWorkflowMachine(AddGrpcServerHandlerWorkflowDefinition), () => ({
      path: "./handlers/health/example.ts",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-grpc-client",
    })),
    step(makeWorkflowMachine(AddGrpcCallWorkflowDefinition), () => ({
      path: "./rpcs/health/example.ts",
    })),

    // Test @saflib/identity workflows
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(IdentityInitWorkflowDefinition), () => ({
      name: "tmp-identity",
      path: "./services/tmp-identity",
    })),

    // Test @saflib/cron workflows
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(CronInitWorkflowDefinition), () => ({
      name: "tmp-cron",
      path: "./services/tmp/tmp-cron",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-cron",
    })),
    step(makeWorkflowMachine(CronAddJobWorkflowDefinition), () => ({
      path: "./jobs/tmp-cron/give-time.ts",
    })),

    // Test @saflib/sdk workflows
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-sdk",
    })),
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/users/list.ts",
    })),
    step(makeWorkflowMachine(AddComponentWorkflowDefinition), () => ({
      path: "./components/user-list",
    })),

    // Test @saflib/vue workflows
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), () => ({
      name: "tmp-spa",
      path: "./clients/tmp/tmp-spa",
    })),
    step(CwdStepMachine, () => ({
      path: "./clients/tmp/tmp-spa",
    })),
    step(makeWorkflowMachine(AddSpaPageWorkflowDefinition), () => ({
      path: "./pages/welcome-new-user",
    })),
  ],
});

export default TestAllWorkflowsDefinition;
