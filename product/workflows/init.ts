import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CopyStepMachine,
  makeLineReplace,
  CommandStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  type ParsePackageNameOutput,
  PromptStepMachine,
} from "@saflib/workflows";
import { AddSpaWorkflowDefinition } from "@saflib/vue/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import path from "node:path";
import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";

const input = [
  {
    name: "name",
    description:
      "Name of the new product",
    exampleValue: "foo",
  },
] as const;

interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
}

export const InitProductWorkflowDefinition = defineWorkflow<
  typeof input,
  InitProductWorkflowContext
>({
  id: "product/init",

  description:
    "Create a new product",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const packageName = getPackageName(input.cwd);
    const packageInfo = parsePackageName(packageName);
    
    return {
      productName: input.name,
      sharedPackagePrefix: `@${packageInfo.organizationName}/${input.name}`,
      organizationName: packageInfo.organizationName,
      packageName: "PACKAGE_NAME_UNUSED",
      serviceName: input.name,
    };
  },

  templateFiles: {
    deploy: path.join(import.meta.dirname, "templates/deploy/__product-name__-dev"),
    monolith: path.join(import.meta.dirname, "templates/services/__product-name__-monolith"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: [],
  },

  steps: [
    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "root",
    })),

    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "admin",
    })),

    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "app",
    })),

    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "auth",
    })),

    step(makeWorkflowMachine(AddSpaWorkflowDefinition), ({ context }) => ({
      productName: context.productName,
      subdomainName: "account",
    })),

    step(makeWorkflowMachine(InitServiceWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-service`,
      path: `./services/${context.productName}`,
    })),

    step(makeWorkflowMachine(IdentityInitWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-identity`,
      path: `./services/${context.productName}-identity`,
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context)
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: path.join(context.cwd, `./services/${context.productName}-monolith`),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate", "--", "--combined"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./deploy/${context.productName}-dev`,
    })),

    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["./.env"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-root-spa`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      "prompt": `Set up the logged-out home page in the ${context.productName}-root-spa, integrating with the other spas.
      
      - Update the home page to have a call to action to the register page. Use linkToProps from @saflib/links to create the link and bind them to vuetify components.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. This spa is "logged out".`
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-auth-spa`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      "prompt": `Set up the ${context.productName}-auth-spa, integrating with the other spas.
      
      - Use the @saflib/auth package's router using 'createAuthRouter'. That will provide login, register, forgot password, and logout pages.
      - Make sure it redirects to the app spa's home page after login, using linkToHref from @saflib/links.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. The app will need to get the 'useProfile' hook from @saflib/auth and use it to determine if the user is logged in or not to give to the layout.`
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-account-spa`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      "prompt": `Set up the ${context.productName}-account-spa, integrating with the other spas.
      
      - Add to the router @saflib/account package's pages for changing password and updating profile.
      - Update the home page to link to those pages.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. This spa is always logged in.`
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./clients/${context.productName}/${context.productName}-clients-common`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      "prompt": `Update the ./components/__product-name__-layout/__ProductName__Layout.vue file in the ${context.sharedPackagePrefix}-clients-common package, adding links to the various spas.
      
      - When logged out, link to the root spa's home page, and the auth spa's register page.
      - When logged in, link to the app spa's home page, and the account spa's profile page.
      - Also, if logged in as admin, link to the admin spa's home page.`
    })),
  ],
});

export default InitProductWorkflowDefinition;