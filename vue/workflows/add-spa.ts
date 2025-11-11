import {
  CopyStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
  CommandStepMachine,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";

const spaDir = path.join(import.meta.dirname, "template", "__product-name__-__subdomain-name__-spa");
const linksDir = path.join(import.meta.dirname, "template", "__product-name__-__subdomain-name__-links");
const clientsDir = path.join(import.meta.dirname, "template", "__product-name__-clients");

const input = [
  {
    name: "productName",
    description:
      "Name of the new or existing product (e.g. 'product-name')",
    exampleValue: "product-name",
  },
  {
    name: "subdomainName",
    description:
      "Name of the new subdomain (e.g. 'admin')",
    exampleValue: "admin",
  }
] as const;

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  subdomainName: string;
  productName: string;
  linksPackageName: string;
  clientsPackageName: string;
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
    const targetDir = path.join(input.cwd, "clients", input.productName, `${input.productName}-${input.subdomainName}-spa`);
    const currentPackageName = getPackageName(input.cwd);
    const currentPackageOrgName = parsePackageName(currentPackageName).organizationName;
    const spaPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-spa`;
    const clientsPackageName = `${currentPackageOrgName}/${input.productName}-clients`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-links`;

    return {
      ...parsePackageName(spaPackageName, {
        requiredSuffix: "-spa",
      }),
      targetDir,
      productName: input.productName,
      subdomainName: input.subdomainName,
      linksPackageName,
      clientsPackageName,
    };
  },

  templateFiles: {
    app: path.join(spaDir, "__SubdomainName__App.vue"),
    i18n: path.join(spaDir, "i18n.ts"),
    main: path.join(spaDir, "main.ts"),
    packageJson: path.join(spaDir, "package.json"),
    router: path.join(spaDir, "router.ts"),
    strings: path.join(spaDir, "strings.ts"),
    testApp: path.join(spaDir, "test-app.ts"),
    tsconfig: path.join(spaDir, "tsconfig.json"),
    vitestConfig: path.join(spaDir, "vitest.config.ts"),

    linksPackageJson: path.join(linksDir, "package.json"),
    linksIndex: path.join(linksDir, "index.ts"),

    clientsPublic: path.join(clientsDir, "public"),
    clientsGitIgnore: path.join(clientsDir, ".gitignore"),
    clientsDockerfile: path.join(clientsDir, "Dockerfile.template"),
    clientsEnvSchema: path.join(clientsDir, "env.schema.combined.json"),
    clientsHeaderPlugin: path.join(clientsDir, "html-header-plugin.ts"),
    clientsIndexHtml: path.join(clientsDir, "index.html"),
    clientsOverridesScss: path.join(clientsDir, "overrides.scss"),
    clientsPackageJson: path.join(clientsDir, "package.json"),
    clientsTsConfig: path.join(clientsDir, "tsconfig.json"),
    clientsTsConfigApp: path.join(clientsDir, "tsconfig.app.json"),
    clientsTsConfigNode: path.join(clientsDir, "tsconfig.node.json"),
    clientsViteConfig: path.join(clientsDir, "vite.config.ts"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/pages/home-page/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    // step(CommandStepMachine, ({ context }) => ({
    //   command: "mkdir",
    //   args: ["-p", path.join(context.targetDir, "pages")],
    // })),

    // step(CommandStepMachine, ({ context }) => ({
    //   command: "cp",
    //   args: [
    //     "-r",
    //     path.join(sourceDir, "pages/home-page"),
    //     path.join(context.targetDir, "pages"),
    //   ],
    // })),

    // step(PromptStepMachine, ({ context }) => ({
    //   promptText: `Add \`${context.packageName}\` as a dependency in the adjacent "clients" or "spas" package, then run \`npm install\` from the root of the monorepo.`,
    // })),

    // step(PromptStepMachine, ({ context }) => ({
    //   promptText: `Create \`index.html\` and \`main.ts\` files in that "clients" or "spas" package similar to other SPAs already there.
      
    //   The folder should be named "${context.subdomainName}".`,
    // })),

    // step(PromptStepMachine, ({ context }) => ({
    //   promptText: `Create and integrate an adjacent "links" package (name should be ${context.linksPackageName}).
      
    //   * Create the links package (name should be ${context.linksPackageName})
    //   * It should just have one "home" link right now, pointing to "/", and the subdomain should be ${context.subdomainName}.
    //   * Add ${context.linksPackageName} as a dependency to ${context.packageName}.
    //   * Use the links package in the router.ts file.`,
    // })),

    // step(PromptStepMachine, ({ context }) => ({
    //   promptText: `Update \`Caddyfiles\` in the repo; add the new SPA in a similar fashion with the subdomain \`${context.subdomainName}\`.
      
    //   Usually you'll just need to update the dev one specific to the product, and the production one.`,
    // })),

    // step(PromptStepMachine, () => ({
    //   promptText: `Test the new SPA by running 'npm run build' from \`deploy/prod\` and make sure there are no errors.`,
    // })),
  ],
});
