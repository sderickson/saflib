import {
  CopyStepMachine,
  CommandStepMachine,
  CwdStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the SDK package to create (e.g., 'user-sdk' or 'analytics-sdk')",
    exampleValue: "example-sdk",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the SDK package (e.g., './clients/example')",
    exampleValue: "./clients/example",
  },
] as const;

interface SdkInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  relDir: string;
  reversePath: string;
}

export const SdkInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SdkInitWorkflowContext
>({
  id: "sdk/init",

  description: "Create an Tanstack/Vue SDK package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} Tanstack/Vue SDK package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const relDir = path.relative(input.cwd, ctx.targetDir);
    const numDirs = relDir.split(path.sep).length;
    const reversePath = "../".repeat(numDirs).slice(0, -1);
    const ctx: SdkInitWorkflowContext = {
      ...parsePackageName(input.name, {
        requiredSuffix: "-sdk",
      }),
      targetDir: path.join(input.cwd, input.path),
      relDir,
      reversePath,
    };
    console.log("ctx", ctx);
    return ctx;
  },

  templateFiles: {
    public: path.join(sourceDir, "public"),
    app: path.join(sourceDir, "App.vue"),
    client: path.join(sourceDir, "client.ts"),
    components: path.join(sourceDir, "components.ts"),
    dockerfile: path.join(sourceDir, "Dockerfile.template"),
    dockerCompose: path.join(sourceDir, "docker-compose.yaml"),
    fakes: path.join(sourceDir, "fakes.ts"),
    i18n: path.join(sourceDir, "i18n.ts"),
    indexHtml: path.join(sourceDir, "index.html"),
    indexTest: path.join(sourceDir, "index.test.ts"),
    index: path.join(sourceDir, "index.ts"),
    mainTs: path.join(sourceDir, "main.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    router: path.join(sourceDir, "router.ts"),
    strings: path.join(sourceDir, "strings.ts"),
    testApp: path.join(sourceDir, "test-app.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    typedFake: path.join(sourceDir, "typed-fake.ts"),
    viteConfig: path.join(sourceDir, "vite.config.ts"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "",
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});

export default SdkInitWorkflowDefinition;
