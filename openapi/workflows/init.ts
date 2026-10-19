import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CdStepMachine,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
} from "@saflib/workflows";
import { offshootStubRoot } from "@saflib/templates";
import path from "node:path";

const offshootSpecRoot = path.join(offshootStubRoot, "spec");
const offshootTestRoot = path.join(offshootStubRoot, "test");

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/spec (and {name}/test). The offshoot spec stands alone; it may reference the product spec's schemas, never the reverse.",
    exampleValue: "dossier",
  },
] as const;

interface OpenapiInitWorkflowContext extends OffshootInitContext {}

export const OpenapiInitWorkflowDefinition = defineWorkflow<
  typeof input,
  OpenapiInitWorkflowContext
>({
  id: "openapi/init",

  description:
    "Scaffold an offshoot OpenAPI package and its sibling test factories package",

  checklistDescription: ({ offshootPackageName, offshootName }) =>
    `Init offshoot spec ${offshootPackageName} (+ ${offshootName}-test).`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) =>
    resolveOffshootInitContext({
      cwd: input.cwd,
      offshootName: input.name,
      layer: "spec",
    }),

  versionControl: {
    allowPaths: ["./dist/**", "./schemas/health.yaml"],
  },

  templateFiles: {
    openapi: path.join(offshootSpecRoot, "openapi.yaml"),
    packageJson: path.join(offshootSpecRoot, "package.json"),
    index: path.join(offshootSpecRoot, "index.ts"),
    tsconfig: path.join(offshootSpecRoot, "tsconfig.json"),
    healthRoute: path.join(offshootSpecRoot, "routes/health.yaml"),
    healthSchema: path.join(offshootSpecRoot, "schemas/health.yaml"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.targetDir,
      templateFiles: {
        offshootSpec: offshootSpecRoot,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: path.join(context.productRoot, context.offshootName, "test"),
      templateFiles: {
        offshootTest: offshootTestRoot,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});
