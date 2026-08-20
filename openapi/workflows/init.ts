import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CdStepMachine,
  TransformFileStepMachine,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
} from "@saflib/workflows";
import { offshootStubRoot, templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const offshootSpecRoot = path.join(offshootStubRoot, "spec");
const parentOpenapiLive = path.join(
  templatesProductRoot,
  "service/spec/openapi.yaml",
);

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/spec and weaves path $refs into the parent openapi.yaml.",
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
    "Scaffold an offshoot OpenAPI package and weave path $refs into the parent spec",

  checklistDescription: ({ offshootPackageName }) =>
    `Init offshoot spec ${offshootPackageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) =>
    resolveOffshootInitContext({
      cwd: input.cwd,
      offshootName: input.name,
      layer: "spec",
    }),

  versionControl: {
    allowPaths: ["./dist/**", "./schemas/error.yaml", "./schemas/health.yaml"],
  },

  templateFiles: {
    openapi: path.join(offshootSpecRoot, "openapi.yaml"),
    packageJson: path.join(offshootSpecRoot, "package.json"),
    index: path.join(offshootSpecRoot, "index.ts"),
    tsconfig: path.join(offshootSpecRoot, "tsconfig.json"),
    healthRoute: path.join(offshootSpecRoot, "routes/health.yaml"),
    healthSchema: path.join(offshootSpecRoot, "schemas/health.yaml"),
    errorSchema: path.join(offshootSpecRoot, "schemas/error.yaml"),
    parentOpenapi: parentOpenapiLive,
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
      targetDir: context.parentDir,
      templateFiles: {
        parentOpenapi: parentOpenapiLive,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.parentDir, "package.json"),
      description: `Add ${context.offshootPackageName} dependency to parent spec`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = pkg.dependencies ?? {};
        pkg.dependencies[context.offshootPackageName] = "*";
        return JSON.stringify(pkg, null, 2) + "\n";
      },
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
      args: ["exec", "saf-specs", "generate"],
    })),
  ],
});
