import {
  CopyStepMachine,
  CommandStepMachine,
  CdStepMachine,
  defineWorkflow,
  step,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
} from "@saflib/workflows";
import { offshootStubRoot } from "@saflib/templates";
import path from "node:path";

const offshootSdkRoot = path.join(offshootStubRoot, "sdk");

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/sdk. SPAs depend on it directly; the product sdk never re-exports it.",
    exampleValue: "dossier",
  },
] as const;

interface SdkInitWorkflowContext extends OffshootInitContext {}

export const SdkInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SdkInitWorkflowContext
>({
  id: "sdk/init",

  description: "Scaffold an offshoot SDK package",

  checklistDescription: ({ offshootPackageName }) =>
    `Init offshoot sdk ${offshootPackageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) =>
    resolveOffshootInitContext({
      cwd: input.cwd,
      offshootName: input.name,
      layer: "sdk",
    }),

  templateFiles: {
    index: path.join(offshootSdkRoot, "index.ts"),
    client: path.join(offshootSdkRoot, "client.ts"),
    packageJson: path.join(offshootSdkRoot, "package.json"),
    tsconfig: path.join(offshootSdkRoot, "tsconfig.json"),
    vitestConfig: path.join(offshootSdkRoot, "vitest.config.js"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.targetDir,
      templateFiles: {
        offshootSdk: offshootSdkRoot,
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
      args: ["run", "typecheck"],
    })),
  ],
});

export default SdkInitWorkflowDefinition;
