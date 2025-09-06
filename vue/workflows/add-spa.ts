import {
  CopyStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows-internal";
import path from "node:path";
import { readFileSync } from "node:fs";

const sourceDir = path.join(import.meta.dirname, "spa-template");

const input = [
  {
    name: "name",
    description: "Name of the new SPA (e.g. 'admin' for web-admin)",
    exampleValue: "example-spa",
  },
] as const;

interface AddSpaWorkflowContext {
  name: string;
  pascalName: string;
  targetDir: string;
  packageName: string;
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
    const thisPackagePath = path.join(process.cwd(), "package.json");
    const thisPackage = JSON.parse(readFileSync(thisPackagePath, "utf8"));
    const thisPackageName = thisPackage.name;
    const thisPackageOrg = thisPackageName.split("/")[0];

    const targetDir = path.join(process.cwd(), "..", "web-" + input.name);

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      targetDir,
      packageName: `${thisPackageOrg}/web-${input.name}`,
    };
  },

  templateFiles: {
    app: path.join(sourceDir, "TemplateFileApp.vue"),
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
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\` as a dependency in \`clients/spas/package.json\`, then run \`npm install\` from the root of the monorepo (not from the \`clients/spas\` directory).`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create \`index.html\` and \`main.ts\` files in \`clients/spas/${context.name}\` similar to other SPAs already there.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update \`clients/spas/vite.config.ts\` to add proxy and input properties for the new SPA.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update all \`Caddyfiles\` in the repo; add the new SPA in a similar fashion with the subdomain \`${context.name}\`.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Test the new SPA by running 'npm run build' from \`deploy/prod\` and make sure there are no errors.`,
    })),
  ],
});
