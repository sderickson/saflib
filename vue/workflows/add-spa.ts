import {
  CopyStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
  CdStepMachine,
  CommandStepMachine,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";

const subdomainDir = path.join(
  import.meta.dirname,
  "template",
  "__subdomain-name__",
);
const linksDir = path.join(import.meta.dirname, "template", "links");
const buildDir = path.join(import.meta.dirname, "template", "build");
const commonDir = path.join(import.meta.dirname, "template", "common");

const input = [
  {
    name: "productName",
    description: "Name of the new or existing product (e.g. 'product-name')",
    exampleValue: "product-name",
  },
  {
    name: "subdomainName",
    description: "Name of the new subdomain (e.g. 'admin')",
    exampleValue: "admin",
  },
] as const;

interface AddSpaWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  subdomainName: string;
  productName: string;
  spaPackageName: string;
  linksPackageName: string;
  clientsPackageName: string;
  commonPackageName: string;
  serviceSpecName: string;
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
    const targetDir = path.join(input.cwd, input.productName, "clients");
    const currentPackageName = getPackageName(input.cwd);
    const currentPackageOrgName =
      "@" + parsePackageName(currentPackageName).organizationName;
    const spaPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-spa`;
    const clientsPackageName = `${currentPackageOrgName}/${input.productName}-clients`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-links`;
    const commonPackageName = `${currentPackageOrgName}/${input.productName}-clients-common`;
    const serviceSpecName = `${currentPackageOrgName}/${input.productName}-spec`;

    return {
      ...parsePackageName(spaPackageName, {
        requiredSuffix: "-spa",
      }),
      targetDir,
      productName: input.productName,
      subdomainName: input.subdomainName,
      linksPackageName,
      clientsPackageName,
      spaPackageName,
      commonPackageName,
      serviceSpecName,
    };
  },

  templateFiles: {
    spa: path.join(subdomainDir, "__SubdomainName__Spa.vue"),
    fixtures: path.join(subdomainDir, "fixtures.ts"),
    i18n: path.join(subdomainDir, "i18n.ts"),
    main: path.join(subdomainDir, "main.ts"),
    packageJson: path.join(subdomainDir, "package.json"),
    router: path.join(subdomainDir, "router.ts"),
    strings: path.join(subdomainDir, "strings.ts"),
    testApp: path.join(subdomainDir, "test-app.ts"),
    tsconfig: path.join(subdomainDir, "tsconfig.json"),
    vitestConfig: path.join(subdomainDir, "vitest.config.ts"),
    homePage: path.join(subdomainDir, "pages/home-page"),

    linksPackage: linksDir,

    clientsPackageJson: path.join(buildDir, "package.json"),
    clientsPackage: buildDir,

    commonPackage: commonDir,
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/pages/home-page/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const lineReplace = makeLineReplace(context);

      // A couple packages don't use the subdomain, so manually
      // substitute the package names here.
      const wrappedLineReplace = (line: string) => {
        line = line.replace(
          "template-package-clients-common",
          context.commonPackageName,
        );
        line = line.replace("template-package-spec", context.serviceSpecName);
        line = line.replace("template-package-links", context.linksPackageName);
        return lineReplace(line);
      };
      return {
        name: context.serviceName,
        targetDir: context.targetDir,
        lineReplace: wrappedLineReplace,
      };
    }),

    step(CdStepMachine, ({ context }) => ({
      path: path.dirname(context.copiedFiles!.packageJson),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: path.dirname(context.copiedFiles!.clientsPackageJson),
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["install", context.spaPackageName],
    })),
  ],
});
