import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface AddEmailTemplateWorkflowInput {
  path: string; // kebab-case, e.g. "./email-templates/weekly-report.ts"
}

interface AddEmailTemplateWorkflowContext extends WorkflowContext {
  name: string; // e.g. "weekly-report"
  camelName: string; // e.g. weeklyReport
  pascalName: string; // e.g. WeeklyReport
  targetDir: string; // e.g. "/<abs-path>/email-templates/"
  targetFilePath: string; // e.g. "/<abs-path>/email-templates/weekly-report.ts"
  sourceDir: string; // e.g. "/<abs-path>/email-template-template/"
  packageJsonPath: string; // path to package.json to check dependencies
}

function toCamelCase(name: string) {
  return name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function toPascalCase(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const AddEmailTemplateWorkflowMachine = setup({
  types: {
    input: {} as AddEmailTemplateWorkflowInput,
    context: {} as AddEmailTemplateWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-email-template",
  description: "Add email template infrastructure and templates to a project.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "email-template-template");
    const targetFilePath = path.join(process.cwd(), input.path);
    const targetDir = path.dirname(targetFilePath);
    const name = path.basename(input.path).split(".")[0];
    const packageJsonPath = path.join(process.cwd(), "package.json");

    return {
      name,
      camelName: toCamelCase(name),
      pascalName: toPascalCase(name),
      targetDir,
      targetFilePath,
      sourceDir,
      packageJsonPath,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    getOriented: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `This workflow will help you add email template infrastructure to your project and create a new email template '${context.name}'.

                The template will be created at: ${context.targetFilePath}

                Steps:
                1. Install @saflib/email dependency if needed
                2. Create email-templates directory if it doesn't exist
                3. Create the email template file from a template
                4. Guide you through implementing the template

                Continue when ready.`,
            ),
          ],
        },
        continue: {
          target: "checkDependencies",
        },
      },
    },
    checkDependencies: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { packageJsonPath } = input;
          if (!existsSync(packageJsonPath)) {
            throw new Error("package.json not found in current directory");
          }

          const content = await readFile(packageJsonPath, "utf-8");
          const pkg = JSON.parse(content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (!deps["@saflib/email"]) {
            return "needs_email_dependency";
          }

          return "dependencies_ok";
        }),
        onDone: [
          {
            guard: ({ event }) => event.output === "needs_email_dependency",
            target: "installEmailDependency",
            actions: logInfo(() => "Need to install @saflib/email dependency"),
          },
          {
            target: "createEmailTemplatesDir",
            actions: logInfo(() => "Dependencies are already installed"),
          },
        ],
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to check dependencies: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to check dependencies. Make sure you're in a directory with a package.json file.",
          ),
        },
        continue: {
          reenter: true,
          target: "checkDependencies",
        },
      },
    },
    installEmailDependency: {
      invoke: {
        src: fromPromise(async () => {
          try {
            const { stdout } = await execAsync("npm install @saflib/email");
            return stdout;
          } catch (error) {
            throw new Error(
              `Failed to install @saflib/email: ${(error as Error).message}`,
            );
          }
        }),
        onDone: {
          target: "createEmailTemplatesDir",
          actions: logInfo(() => "Installed @saflib/email dependency"),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to install dependency: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to install @saflib/email. Please check npm is available and try again.",
          ),
        },
        continue: {
          reenter: true,
          target: "installEmailDependency",
        },
      },
    },
    createEmailTemplatesDir: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir } = input;
          if (!existsSync(targetDir)) {
            await mkdir(targetDir, { recursive: true });
            return "created_directory";
          }
          return "directory_exists";
        }),
        onDone: {
          target: "copyTemplate",
          actions: logInfo(({ context, event }) =>
            event.output === "created_directory"
              ? `Created email-templates directory at ${context.targetDir}`
              : `Email-templates directory already exists at ${context.targetDir}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to create directory: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to create the email-templates directory. Please check permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "createEmailTemplatesDir",
        },
      },
    },
    copyTemplate: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { sourceDir, targetFilePath, name, camelName, pascalName } =
            input;

          const templatePath = path.join(sourceDir, "email-template.ts");
          if (!existsSync(templatePath)) {
            throw new Error(`Template file not found at ${templatePath}`);
          }

          let content = await readFile(templatePath, "utf-8");

          // Replace template placeholders
          content = content
            .replace(/emailTemplate/g, camelName)
            .replace(/email-template/g, name)
            .replace(/EmailTemplate/g, pascalName);

          await writeFile(targetFilePath, content);
          return "Template copied and placeholders replaced";
        }),
        onDone: {
          target: "implementTemplate",
          actions: logInfo(
            ({ context }) =>
              `Created email template at ${context.targetFilePath}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to copy template: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to copy the template file. Please check if the source template exists and you have write permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "copyTemplate",
        },
      },
    },
    implementTemplate: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Implement the email template at ${context.targetFilePath}:

                1. Update the function signature and export name to match your use case
                2. Define the email subject and HTML content
                3. Follow the pattern from existing templates like verify-email.ts and password-reset.ts
                4. Return an object with \`subject\` and \`html\` properties
                5. Use proper TypeScript types

                The template should export a function that takes the necessary parameters and returns EmailContent with subject and html properties.`,
            ),
          ],
        },
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class AddEmailTemplateWorkflow extends XStateWorkflow {
  machine = AddEmailTemplateWorkflowMachine;
  description = "Add email template infrastructure and templates to a project.";
  cliArguments = [
    {
      name: "path",
      description:
        "Path of the new email template (e.g. './email-templates/weekly-report.ts')",
    },
  ];
}
