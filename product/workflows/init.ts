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
import {
  AddSpaWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
} from "@saflib/vue/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import path from "node:path";
import { IdentityInitWorkflowDefinition } from "@saflib/identity/workflows";
import fs from "node:fs";

const input = [
  {
    name: "name",
    description: "Name of the new product",
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

  description: "Create a new product",

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
    all: path.join(import.meta.dirname, "templates/"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `**/${context.productName}/clients/**`,
      `./package.json`,
      `**/${context.productName}/service/${context.productName}-service/**`,
    ],
    commitEachStep: true,
  },

  steps: [
    step(CommandStepMachine, ({ context }) => {
      if (context.runMode === "dry" || context.runMode === "checklist") {
        return {
          command: "echo",
          args: ["Skip appending to workspaces."],
        };
      }

      // hack to add the product to the workspaces w/out deps
      // probably the makings of a new workflow step here
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(context.cwd, "package.json"), "utf8"),
      );
      const newWorkspaces = Array.from(
        new Set([...packageJson.workspaces, `${context.productName}/**`]),
      );
      newWorkspaces.sort();
      packageJson.workspaces = newWorkspaces;
      fs.writeFileSync(
        path.join(context.cwd, "package.json"),
        JSON.stringify(packageJson, null, 2),
      );
      return {
        command: "npm",
        args: ["exec", "prettier", "--", "package.json", "--write"],
      };
    }),
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), ({ context }) => ({
      name: `${context.sharedPackagePrefix}-service`,
      path: `./${context.productName}/service`,
    })),
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
    step(
      makeWorkflowMachine(IdentityInitWorkflowDefinition),
      ({ context }) => ({
        name: `${context.sharedPackagePrefix}-identity`,
        path: `./${context.productName}/service/identity`,
      }),
    ),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context),
    })),
    step(CommandStepMachine, ({ context }) => ({
      command: "rm",
      args: [
        "-rf",
        `./${context.productName}/service/${context.productName}-service`,
      ],
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "mv",
      args: [
        `./deploy/remote-assets/env.${context.productName}.secrets`,
        `./deploy/remote-assets/.env.${context.productName}.secrets`,
      ],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: path.join(context.cwd, `./${context.productName}/service/monolith`),
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate", "--", "--combined"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/dev`,
    })),
    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["./.env"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/root`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/auth-links"],
    })),

    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), ({ context }) => ({
      path: "./pages/home",
      prompt: `Set up the logged-out home page in the ${context.productName} root SPA.
      - Remove anything happening in the loader; this page will be static.
      - Update the home page to have a call to action to the register page. Use linkToProps from @saflib/links to create the link and bind them to vuetify components. Get the link object from @saflib/auth-links which is in saflib/identity/auth-links.
      - Give it really basic content for now, will fit it in later.`,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/auth`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/auth", "@saflib/auth-links"],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Set up the ${context.productName} auth SPA, integrating with the other SPAs.
      - Use the @saflib/auth package's router using 'createAuthRouter'. That will provide login, register, forgot password, and logout pages.
      - Include authAppStrings from @saflib/auth/strings in this product's auth SPA's strings file, so i18n works.
      - Make sure it redirects to the app spa's home page after login/register, using linkToHrefWithHost from @saflib/links. And to root home page after logout.
      - Update the layout in the main AuthSpa.vue component. The app will need to get the 'useProfile' hook from @saflib/auth and use it to determine if the user is logged in or not to give to the layout.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/app`,
    })),
    step(PromptStepMachine, () => ({
      prompt: `Update the layout in AppSpa.vue to always be logged in.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), () => ({
      path: "./pages/home",
      prompt: `Set up the app SPA similar to the root SPA, just put some really basic content for now, will fit it in later.
      `,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/account`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/account-sdk", "@saflib/auth-links"],
    })),
    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), ({ context }) => ({
      path: "./pages/home",
      prompt: `Set up the ${context.productName} account SPA home page.
      - Add to the router @saflib/account-sdk package's AccountPasswordPageAsync and AccountProfilePageAsync.
      - Include the accountSdkStrings from @saflib/account-sdk/strings in the account-spa's strings file, so i18n works.
      - Update the home page to link to those pages.
      - Update the layout in AccountSpa.vue to always logged in.`,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/admin`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/admin-sdk", "@saflib/auth-links"],
    })),

    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), ({ context }) => ({
      path: "./pages/admin",
      prompt: `Set up the ${context.productName} admin SPA home page.
      - It can just be a stub for now, will fit it in later.`,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/common`,
    })),
    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: [
        "install",
        "@saflib/auth-links",
        "@saflib/auth",
        `${context.sharedPackagePrefix}-links`,
      ],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Update the layout component in the ${context.productName} common package, adding links to the various SPAs.
      - When logged out, link to the root spa's home page, and the auth spa's register page.
      - When logged in, link to the app spa's home page, the account spa's home page, and the auth spa's logout page.
      - Also, if logged in as admin, link to the admin spa's home page.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CdStepMachine, () => ({
      path: `./deploy`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});

export default InitProductWorkflowDefinition;
