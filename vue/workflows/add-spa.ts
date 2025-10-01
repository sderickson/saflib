import {
  CopyStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "template");

const input = [
  {
    name: "name",
    description:
      "Name of the new SPA (e.g. 'admin' for product-name-admin-spa)",
    exampleValue: "product-name-example-spa",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the SPA (e.g., './clients/product-name/admin-spa')",
    exampleValue: "./clients/product-name/product-name-admin-spa",
  },
] as const;

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  subdomainName: string;
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

    const context = {
      ...parsePackageName(input.name, {
        requiredSuffix: "-spa",
      }),
      targetDir,
      subdomainName: "",
    };

    // Experimental: I'm trying out organizing SPAs by product, so one monorepo has multiple products.
    // but then, the package name needs to be of the form "<product-name>-<subdomain>-spa"
    // If we assume that's the case, then derive the subdomain name from the package name.
    const productName = path.basename(path.dirname(targetDir));

    // "service name" is just the name of the package minus the suffix "-spa".
    // So, find the product name based on the parent dir, and then remove it from the service name
    // to get the subdomain name.

    // this is brittle... will think of a way to improve this.
    let subdomainName = context.serviceName;
    if (subdomainName.startsWith(productName + "-")) {
      subdomainName = subdomainName.slice(productName.length + 1);
    }
    context.subdomainName = subdomainName;
    return context;
  },

  templateFiles: {
    app: path.join(sourceDir, "__SubdomainName__App.vue"),
    i18n: path.join(sourceDir, "i18n.ts"),
    main: path.join(sourceDir, "main.ts"),
    packageJson: path.join(sourceDir, "package.json"),
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

    step(CommandStepMachine, ({ context }) => ({
      command: "mkdir",
      args: ["-p", path.join(context.targetDir, "pages")],
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "cp",
      args: [
        "-r",
        path.join(sourceDir, "pages/home-page"),
        path.join(context.targetDir, "pages"),
      ],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\` as a dependency in the adjacent "clients" or "spas" package, then run \`npm install\` from the root of the monorepo.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create \`index.html\` and \`main.ts\` files in that "clients" or "spas" package similar to other SPAs already there.
      
      The folder should be named "${context.subdomainName}".`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update \`clients/spas/vite.config.ts\` in the clients/spas package to add proxy and input properties for the new SPA.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update all \`Caddyfiles\` in the repo; add the new SPA in a similar fashion with the subdomain \`${context.subdomainName}\`.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Test the new SPA by running 'npm run build' from \`deploy/prod\` and make sure there are no errors.`,
    })),
  ],
});
