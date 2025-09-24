import {
  CopyStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "template");

const input = [
  {
    name: "name",
    description: "Name of the new SPA (e.g. 'admin' for admin-spa)",
    exampleValue: "example-spa",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the SPA (e.g., './clients/admin-spa')",
    exampleValue: "./clients/admin-spa",
  },
] as const;

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const AddSpaWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSpaWorkflowContext
>({
  id: "vue/add-spa",

  description:
    "Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);

    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-spa",
      }),
      targetDir,
    };
  },

  templateFiles: {
    app: path.join(sourceDir, "__ServiceName__App.vue"),
    i18n: path.join(sourceDir, "i18n.ts"),
    main: path.join(sourceDir, "main.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    pages: path.join(sourceDir, "pages"),
    router: path.join(sourceDir, "router.ts"),
    strings: path.join(sourceDir, "strings.ts"),
    testApp: path.join(sourceDir, "test-app.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\` as a dependency in \`clients/spas/package.json\`, then run \`npm install\` from the root of the monorepo (not from the \`clients/spas\` directory).`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create \`index.html\` and \`main.ts\` files in \`clients/spas/${context.serviceName}\` similar to other SPAs already there.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update \`clients/spas/vite.config.ts\` to add proxy and input properties for the new SPA.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update all \`Caddyfiles\` in the repo; add the new SPA in a similar fashion with the subdomain \`${context.serviceName}\`.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Test the new SPA by running 'npm run build' from \`deploy/prod\` and make sure there are no errors.`,
    })),
  ],
});
