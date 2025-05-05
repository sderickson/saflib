import { SimpleWorkflow } from "@saflib/workflows";
import path from "path";
import { existsSync } from "fs";
interface UpdateSchemaWorkflowParams {}

export class UpdateSchemaWorkflow extends SimpleWorkflow<UpdateSchemaWorkflowParams> {
  name = "update-schema";
  description =
    "Change the schema of a database built off the drizzle-sqlite3 package.";

  init = async () => {
    this.params = {};
    return { data: {} };
  };

  cliArguments = [];

  workflowPrompt = () => {
    return "You are updating the schema of a database built off the @saflib/drizzle-sqlite3 package. This includes following best practices and generating migration files.";
  };

  computed = () => {
    const refDoc = path.resolve(import.meta.dirname, "../docs/02-schema.md");
    const refDocAbsPath = path.resolve(process.cwd(), refDoc);
    if (!existsSync(refDocAbsPath)) {
      throw new Error(`Reference documentation not found: ${refDocAbsPath}`);
    }
    return { refDoc: refDocAbsPath };
  };

  steps = [
    {
      name: "Get Oriented",
      prompt: () =>
        `First, read the project spec and also the reference documentation for the @saflib/drizzle-sqlite3 package. If they haven't already, ask the user for the project spec.

        Also, read the guidelines for tables and columns in the doc: ${this.computed().refDoc}`,
    },
    {
      name: "Update Schema",
      prompt: () =>
        `Find the "schema.ts" file in this folder and update it based on the spec.`,
    },
    {
      name: "Generate Migration",
      prompt: () =>
        `Generate a migration file based on the changes you made to the schema. Run "npm run generate" and make sure it succeeds.`,
    },
  ];
}
