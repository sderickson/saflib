import {
  CopyStepMachine,
  CommandStepMachine,
  CdStepMachine,
  defineWorkflow,
  step,
  TransformFileStepMachine,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
} from "@saflib/workflows";
import { offshootStubRoot, templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const offshootSdkRoot = path.join(offshootStubRoot, "sdk");
const parentFakesLive = path.join(templatesProductRoot, "service/sdk/fakes.ts");

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/sdk and weaves fakes into the parent sdk package.",
    exampleValue: "dossier",
  },
] as const;

interface SdkInitWorkflowContext extends OffshootInitContext {}

export const SdkInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SdkInitWorkflowContext
>({
  id: "sdk/init",

  description:
    "Scaffold an offshoot SDK package and weave its fake handlers into the parent sdk",

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
    fakes: path.join(offshootSdkRoot, "fakes.ts"),
    index: path.join(offshootSdkRoot, "index.ts"),
    packageJson: path.join(offshootSdkRoot, "package.json"),
    tsconfig: path.join(offshootSdkRoot, "tsconfig.json"),
    vitestConfig: path.join(offshootSdkRoot, "vitest.config.js"),
    test: path.join(offshootSdkRoot, "index.test.ts"),
    parentFakes: parentFakesLive,
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

    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.parentDir,
      templateFiles: {
        parentFakes: parentFakesLive,
      },
      lineReplace: makeOffshootLineReplace(context),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.parentDir, "package.json"),
      description: `Add ${context.offshootPackageName} dependency to parent sdk`,
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

export default SdkInitWorkflowDefinition;
