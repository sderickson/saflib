import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CdStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
} from "@saflib/workflows";
import { offshootStubRoot, templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const offshootDbRoot = path.join(offshootStubRoot, "db");
const parentSchemaLive = path.join(
  templatesProductRoot,
  "service/db/schema.ts",
);

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/db and weaves into the parent db package.",
    exampleValue: "dossier",
  },
] as const;

interface DrizzleInitWorkflowContext extends OffshootInitContext {}

export const DrizzleInitWorkflowDefinition = defineWorkflow<
  typeof input,
  DrizzleInitWorkflowContext
>({
  id: "drizzle/init",

  description:
    "Scaffold an offshoot db package and weave its schemas into the parent db (no second monolith)",

  checklistDescription: ({ offshootPackageName }) =>
    `Init offshoot db ${offshootPackageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) =>
    resolveOffshootInitContext({
      cwd: input.cwd,
      offshootName: input.name,
      layer: "db",
    }),

  templateFiles: {
    packageJson: path.join(offshootDbRoot, "package.json"),
    schema: path.join(offshootDbRoot, "schema.ts"),
    seedSchema: path.join(offshootDbRoot, "schemas/__offshoot-name__.ts"),
    errors: path.join(offshootDbRoot, "errors.ts"),
    types: path.join(offshootDbRoot, "types.ts"),
    tsconfig: path.join(offshootDbRoot, "tsconfig.json"),
    vitestConfig: path.join(offshootDbRoot, "vitest.config.js"),
    test: path.join(offshootDbRoot, "index.test.ts"),
    parentSchema: parentSchemaLive,
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.targetDir,
      templateFiles: {
        offshootDb: offshootDbRoot,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.parentDir,
      templateFiles: {
        parentSchema: parentSchemaLive,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.parentDir, "package.json"),
      description: `Add ${context.offshootPackageName} dependency to parent db`,
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
      args: ["run", "typecheck"],
    })),
  ],
});
