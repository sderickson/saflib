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

const spaDir = path.join(
  import.meta.dirname,
  "template",
  "__product-name__-__subdomain-name__-spa",
);
const linksDir = path.join(
  import.meta.dirname,
  "template",
  "__product-name__-__subdomain-name__-links",
);
const clientsDir = path.join(
  import.meta.dirname,
  "template",
  "__product-name__-clients",
);
const commonDir = path.join(
  import.meta.dirname,
  "template",
  "__product-name__-clients-common",
);

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
    const targetDir = path.join(input.cwd, "clients", input.productName);
    const currentPackageName = getPackageName(input.cwd);
    const currentPackageOrgName =
      "@" +parsePackageName(currentPackageName).organizationName;
    const spaPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-spa`;
    const clientsPackageName = `${currentPackageOrgName}/${input.productName}-clients`;
    const linksPackageName = `${currentPackageOrgName}/${input.productName}-${input.subdomainName}-links`;
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
    app: path.join(spaDir, "__SubdomainName__App.vue"),
    i18n: path.join(spaDir, "i18n.ts"),
    main: path.join(spaDir, "main.ts"),
    packageJson: path.join(spaDir, "package.json"),
    router: path.join(spaDir, "router.ts"),
    strings: path.join(spaDir, "strings.ts"),
    testApp: path.join(spaDir, "test-app.ts"),
    tsconfig: path.join(spaDir, "tsconfig.json"),
    vitestConfig: path.join(spaDir, "vitest.config.ts"),
    homePage: path.join(spaDir, "pages/home-page"),

    linksPackage: linksDir,

    clientsPackageJson: path.join(clientsDir, "package.json"),
    clientsPackage: clientsDir,

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
        line = line.replace(
          "template-package-spec",
          context.serviceSpecName,
        );
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
