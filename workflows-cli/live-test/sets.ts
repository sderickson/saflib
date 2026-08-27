import type { AnyStateMachine } from "xstate";
import {
  step,
  CdStepMachine,
  CommandStepMachine,
  makeWorkflowMachine,
  type WorkflowStep,
} from "@saflib/workflows";
import {
  InitProductWorkflowDefinition,
} from "@saflib/product/workflows";
import {
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  OpenapiInitWorkflowDefinition,
} from "@saflib/openapi/workflows";
import {
  UpdateSchemaWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
  DrizzleInitWorkflowDefinition,
} from "@saflib/drizzle/workflows";
import {
  AddHandlerWorkflowDefinition,
  ExpressInitWorkflowDefinition,
} from "@saflib/express/workflows";
import {
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  SdkInitWorkflowDefinition,
} from "@saflib/sdk/workflows";
import {
  AddSpaViewWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
} from "@saflib/vue/workflows";
import { ServiceAddStoreWorkflowDefinition } from "@saflib/service/workflows";

/** Disposable product from product/init — never committed. */
export const LIVE_TEST_PRODUCT = "tmp";

/**
 * Disposable deploy tree for live-test (`SAF_DEPLOY_DIR`). Golden `saflib/deploy/`
 * stays read-only; product/init and add-* upsert here instead.
 */
export const LIVE_TEST_DEPLOY = "tmp-deploy";

export type LiveTestContext = Record<string, never>;

export type LiveTestStep = WorkflowStep<LiveTestContext, AnyStateMachine>;

export type LiveTestSet = {
  /** CLI name, e.g. `drizzle` for `npm run live-test drizzle`. */
  name: string;
  description: string;
  /**
   * Packages under the disposable product to `npm run typecheck` after this set
   * (paths relative to the product root, e.g. `service/db`).
   */
  typecheck?: string[];
  /** Paths relative to the product root that must exist after this set. */
  assertFiles?: string[];
  steps: LiveTestStep[];
};

function typecheckAfter(packages: string[]): LiveTestStep[] {
  return packages.flatMap((pkg) => [
    step(CdStepMachine, () => ({
      path: `./${LIVE_TEST_PRODUCT}/${pkg}`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      forceInScript: true,
    })),
  ]);
}

function assertFilesAfter(files: string[]): LiveTestStep[] {
  if (files.length === 0) {
    return [];
  }
  return [
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(CommandStepMachine, () => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        "./workflows-cli/live-test/assert-files.ts",
        LIVE_TEST_PRODUCT,
        ...files,
      ],
    })),
  ];
}

/**
 * Named, independent live-test sets. Each runs after `product/init` of `tmp`
 * (and may assume earlier sets already ran when executing the full suite).
 */
export const liveTestSets: LiveTestSet[] = [
  {
    name: "openapi",
    description: "openapi/schema + openapi/route (todo list)",
    typecheck: ["service/spec"],
    assertFiles: [
      "service/spec/schemas/todo.yaml",
      "service/spec/routes/todo/list.yaml",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/spec`,
      })),
      step(makeWorkflowMachine(OpenApiSchemaWorkflowDefinition), () => ({
        name: "todo",
      })),
      step(makeWorkflowMachine(OpenApiRouteWorkflowDefinition), () => ({
        path: "./routes/todo/list.yaml",
        urlPath: "/todos",
        method: "get",
      })),
    ],
  },
  {
    name: "drizzle",
    description: "drizzle/update-schema + drizzle/add-query (todo)",
    typecheck: ["service/db"],
    assertFiles: [
      "service/db/schemas/todo.ts",
      "service/db/queries/todo/list.ts",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/db`,
      })),
      step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
        path: "./schemas/todo.ts",
      })),
      step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
        path: "./queries/todo/list.ts",
      })),
    ],
  },
  {
    name: "express",
    description: "express/add-handler (todo list)",
    typecheck: ["service/http"],
    assertFiles: [
      "service/http/handlers/todo/list.ts",
      "service/http/handlers/todo/index.ts",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/http`,
      })),
      step(CommandStepMachine, () => ({
        command: "npm",
        args: ["install"],
      })),
      step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
        path: "./handlers/todo/list.ts",
      })),
    ],
  },
  {
    name: "sdk",
    description: "sdk/add-query + sdk/add-mutation (todo)",
    typecheck: ["service/sdk"],
    assertFiles: [
      "service/sdk/requests/todo/list.ts",
      "service/sdk/requests/todo/create.ts",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/sdk`,
      })),
      step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
        path: "./requests/todo/list.ts",
        urlPath: "/todos",
        method: "get",
      })),
      step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
        path: "./requests/todo/create.ts",
        urlPath: "/todos",
        method: "post",
      })),
    ],
  },
  {
    name: "vue",
    description: "vue/add-view (app SPA todos-list page)",
    typecheck: ["clients/links", "clients/app"],
    assertFiles: [
      "clients/app/pages/todos-list/TodosList.vue",
      "clients/app/pages/todos-list/TodosListAsync.vue",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/clients/app`,
      })),
      step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), () => ({
        path: "./pages/todos-list",
        urlPath: "/todos",
      })),
    ],
  },
  {
    name: "static-site",
    description: "vue/add-static-site (docs VitePress site)",
    typecheck: ["clients/links"],
    assertFiles: [
      "clients/docs/package.json",
      "clients/docs/content/index.md",
      "clients/docs/.vitepress/theme/components/StaticSiteLayout.vue",
    ],
    steps: [
      step(CdStepMachine, () => ({
        path: ".",
      })),
      step(makeWorkflowMachine(AddStaticSiteWorkflowDefinition), () => ({
        productName: LIVE_TEST_PRODUCT,
        subdomainName: "docs",
      })),
      step(CdStepMachine, () => ({
        path: ".",
      })),
      step(CommandStepMachine, () => ({
        command: "node",
        args: [
          "--experimental-strip-types",
          "--disable-warning=ExperimentalWarning",
          "./workflows-cli/live-test/assert-contains.ts",
          `${LIVE_TEST_PRODUCT}/dev/caddy-config/Caddyfile`,
          "docs.docker.localhost",
          "/tmp-static-docs",
        ],
      })),
      step(CommandStepMachine, () => ({
        command: "node",
        args: [
          "--experimental-strip-types",
          "--disable-warning=ExperimentalWarning",
          "./workflows-cli/live-test/assert-contains.ts",
          `${LIVE_TEST_PRODUCT}/dev/build-images.sh`,
          "./tmp/clients/docs/Dockerfile",
          "saflib-tmp-docs-static",
        ],
      })),
      step(CommandStepMachine, () => ({
        command: "node",
        args: [
          "--experimental-strip-types",
          "--disable-warning=ExperimentalWarning",
          "./workflows-cli/live-test/assert-contains.ts",
          `${LIVE_TEST_PRODUCT}/dev/Dockerfile.template`,
          "docs-static-builder",
          "/srv/tmp-static-docs",
        ],
      })),
    ],
  },
  {
    name: "e2e",
    description: "vue/add-e2e-test (app SPA smoke spec)",
    assertFiles: ["clients/app/e2e/smoke.spec.ts"],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/clients/app`,
      })),
      step(makeWorkflowMachine(AddE2eTestWorkflowDefinition), () => ({
        path: "./e2e/smoke.spec.ts",
      })),
    ],
  },
  {
    name: "store",
    description: "service/add-store (uploads ObjectStore on common context)",
    typecheck: ["service/common"],
    assertFiles: ["service/common/context.ts"],
    steps: [
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/common`,
      })),
      step(makeWorkflowMachine(ServiceAddStoreWorkflowDefinition), () => ({
        name: "uploads",
      })),
      step(CdStepMachine, () => ({
        path: ".",
      })),
      step(CommandStepMachine, () => ({
        command: "node",
        args: [
          "--experimental-strip-types",
          "--disable-warning=ExperimentalWarning",
          "./workflows-cli/live-test/assert-contains.ts",
          `${LIVE_TEST_PRODUCT}/service/common/context.ts`,
          "uploads",
          "createObjectStore",
        ],
      })),
    ],
  },
  {
    name: "offshoot",
    description:
      "Init dossier offshoot (spec/db/http/sdk) + add schema/route/handler/db-query/sdk-query on main and offshoot",
    typecheck: [
      "service/spec",
      "service/db",
      "service/http",
      "service/sdk",
      "dossier/spec",
      "dossier/db",
      "dossier/http",
      "dossier/sdk",
    ],
    assertFiles: [
      "dossier/db/package.json",
      "dossier/spec/openapi.yaml",
      "dossier/http/routers.ts",
      "dossier/sdk/package.json",
      "dossier/spec/schemas/item.yaml",
      "dossier/spec/routes/item/list.yaml",
      "dossier/db/schemas/item.ts",
      "dossier/db/queries/item/list.ts",
      "dossier/http/handlers/item/list.ts",
      "dossier/sdk/requests/item/list.ts",
      "service/spec/schemas/note.yaml",
      "service/spec/routes/note/list.yaml",
      "service/db/schemas/note.ts",
      "service/db/queries/note/list.ts",
      "service/http/handlers/note/list.ts",
      "service/sdk/requests/note/list.ts",
      "service/db/schema.ts",
    ],
    steps: [
      // --- scaffold dossier offshoot layers ---
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}`,
      })),
      step(makeWorkflowMachine(OpenapiInitWorkflowDefinition), () => ({
        name: "dossier",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}`,
      })),
      step(makeWorkflowMachine(DrizzleInitWorkflowDefinition), () => ({
        name: "dossier",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}`,
      })),
      step(makeWorkflowMachine(ExpressInitWorkflowDefinition), () => ({
        name: "dossier",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}`,
      })),
      step(makeWorkflowMachine(SdkInitWorkflowDefinition), () => ({
        name: "dossier",
      })),

      // --- main service: schema → route → handler → db query → sdk query ---
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/spec`,
      })),
      step(makeWorkflowMachine(OpenApiSchemaWorkflowDefinition), () => ({
        name: "note",
      })),
      step(makeWorkflowMachine(OpenApiRouteWorkflowDefinition), () => ({
        path: "./routes/note/list.yaml",
        urlPath: "/notes",
        method: "get",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/db`,
      })),
      step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
        path: "./schemas/note.ts",
      })),
      step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
        path: "./queries/note/list.ts",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/http`,
      })),
      step(CommandStepMachine, () => ({
        command: "npm",
        args: ["install"],
      })),
      step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
        path: "./handlers/note/list.ts",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/service/sdk`,
      })),
      step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
        path: "./requests/note/list.ts",
        urlPath: "/notes",
        method: "get",
      })),

      // --- dossier offshoot: same vertical slice ---
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/dossier/spec`,
      })),
      step(makeWorkflowMachine(OpenApiSchemaWorkflowDefinition), () => ({
        name: "item",
      })),
      step(makeWorkflowMachine(OpenApiRouteWorkflowDefinition), () => ({
        path: "./routes/item/list.yaml",
        urlPath: "/dossier/items",
        method: "get",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/dossier/db`,
      })),
      step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
        path: "./schemas/item.ts",
      })),
      step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
        path: "./queries/item/list.ts",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/dossier/http`,
      })),
      step(CommandStepMachine, () => ({
        command: "npm",
        args: ["install"],
      })),
      step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
        path: "./handlers/item/list.ts",
      })),
      step(CdStepMachine, () => ({
        path: `./${LIVE_TEST_PRODUCT}/dossier/sdk`,
      })),
      step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
        path: "./requests/item/list.ts",
        urlPath: "/dossier/items",
        method: "get",
      })),

      // Cd is always relative to the live-test original cwd (saflib/), not process.cwd().
      step(CdStepMachine, () => ({
        path: ".",
      })),
      step(CommandStepMachine, () => ({
        command: "node",
        args: [
          "--experimental-strip-types",
          "--disable-warning=ExperimentalWarning",
          "./workflows-cli/live-test/assert-contains.ts",
          `${LIVE_TEST_PRODUCT}/service/db/schema.ts`,
          "@saflib/tmp-dossier-db/schema",
        ],
      })),
    ],
  },
];

export function getLiveTestSet(name: string): LiveTestSet | undefined {
  return liveTestSets.find((s) => s.name === name);
}

export function listLiveTestSetNames(): string[] {
  return liveTestSets.map((s) => s.name);
}

/** Expand a set into workflow steps + assert + typecheck. */
export function expandLiveTestSet(set: LiveTestSet): LiveTestStep[] {
  return [
    ...set.steps,
    ...assertFilesAfter(set.assertFiles ?? []),
    ...typecheckAfter(set.typecheck ?? []),
  ];
}

export function setupLiveTestSteps(): LiveTestStep[] {
  return [
    step(makeWorkflowMachine(InitProductWorkflowDefinition), () => ({
      name: LIVE_TEST_PRODUCT,
      domain: "temporary.com",
    })),
  ];
}

export function teardownLiveTestSteps(): LiveTestStep[] {
  // Cleanup also runs from live-test.ts `finally` so failures mid-suite still
  // restore package.json / remove scaffold CI. Keep a workflow step as a
  // checklist breadcrumb when the suite succeeds inside the state machine.
  return [
    step(CdStepMachine, () => ({
      path: ".",
    })),
    step(CommandStepMachine, () => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        "./workflows-cli/cleanup-product-init-artifacts.ts",
      ],
    })),
  ];
}
