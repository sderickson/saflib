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
    all: path.join(import.meta.dirname, "templates/__product-name__"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/clients/**", "**/package.json", "**/service/*-service/**"],
  },

  steps: [
    step(
      CommandStepMachine,
      ({ context }) => {
        // hack to add the product to the workspaces w/out deps
        // probably the makings of a new workflow step here
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(context.cwd, "package.json"), "utf8"),
        );
        const newWorkspaces = [
          ...packageJson.workspaces,
          `${context.productName}/**`,
        ];
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
      },
      {
        commitAfter: {
          message: `Add product package to package.json workspaces`,
        },
      },
    ),
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
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "rm",
        args: [
          "-rf",
          `./${context.productName}/service/${context.productName}-service`,
        ],
      }),
      { commitAfter: { message: `Remove original service package` } },
    ),
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
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Set up the logged-out home page in the root SPA, integrating with the other SPAs.
      - Update the home page to have a call to action to the register page. Use linkToProps from @saflib/links to create the link and bind them to vuetify components. Get the link object from @saflib/auth-links which is in saflib/identity/auth-links.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. This spa is "logged out".`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/auth`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/auth", "@saflib/auth-links"],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Set up the auth SPA, integrating with the other SPAs.
      - Use the @saflib/auth package's router using 'createAuthRouter'. That will provide login, register, forgot password, and logout pages.
      - Include the @saflib/auth/strings in the auth SPA's strings file, so i18n works.
      - Make sure it redirects to the app spa's home page after login/register, using linkToHref from @saflib/links. And to root home page after logout.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. The app will need to get the 'useProfile' hook from @saflib/auth and use it to determine if the user is logged in or not to give to the layout.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/app`,
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Set up the app SPA, integrating with the other SPAs.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. The app is always logged in.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/account`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/account-sdk", "@saflib/auth-links"],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Set up the account SPA, integrating with the other SPAs.
      - Add to the router @saflib/account-sdk package's pages for changing password and updating profile.
      - Include the @saflib/account-sdk/strings in the account-spa's strings file, so i18n works.
      - Update the home page to link to those pages.
      - Incorporate the Layout exported from the ${context.sharedPackagePrefix}-clients-common package. This spa is always logged in.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/clients/common`,
    })),
    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: [
        "install",
        "@saflib/auth-links",
        `${context.sharedPackagePrefix}-links`,
      ],
    })),
    step(PromptStepMachine, ({ context }) => ({
      prompt: `Update the layout component in the common package, adding links to the various SPAs.
      - When logged out, link to the root spa's home page, and the auth spa's register page.
      - When logged in, link to the app spa's home page, the account spa's home page, and the auth spa's logout page.
      - Also, if logged in as admin, link to the admin spa's home page.`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
    // step(CdStepMachine, ({ context }) => ({
    //   path: `./${context.productName}/dev`,
    // })),
    // step(CommandStepMachine, () => ({
    //   command: "npm",
    //   args: ["run", "up"],
    // })),
    // step(PromptStepMachine, ({ context }) => ({
    //   prompt: `The dev environment is running on http://${context.productName}.docker.localhost. Please make sure it works.
    //   - Navigate to http://${context.productName}.docker.localhost and make sure it looks good.
    //   - Create a test account, make sure you end up on the app spa's home page.
    //   - Log out, make sure you end up back on the root spa's home page, then log in again.
    //   - Go to the account spa's home page, make sure you can change your password and update your profile.
    // `,
    // })),
    // step(CommandStepMachine, () => ({
    //   command: "npm",
    //   args: ["run", "down"],
    // })),
  ],
});

export default InitProductWorkflowDefinition;
