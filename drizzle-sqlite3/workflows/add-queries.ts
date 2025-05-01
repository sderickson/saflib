import { SimpleWorkflow } from "@saflib/workflows";
import path from "path";
import { existsSync } from "fs";

interface AddQueriesWorkflowParams {}

export class AddQueriesWorkflow extends SimpleWorkflow<AddQueriesWorkflowParams> {
  name = "add-queries";
  description =
    "Add queries to a database built off the drizzle-sqlite3 package.";

  init = async () => {
    this.params = {};
    return { data: {} };
  };

  cliArguments = [];

  workflowPrompt = () => {
    return "You are adding queries to a database built off the drizzle-sqlite3 package. This is how consumers of the database will access and edit the data there; this is effectively the database interface.";
  };

  computed = () => {
    const refDoc = path.resolve(import.meta.dirname, "../docs/03-queries.md");
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
        `Read the project spec and the reference documentation for the @saflib/drizzle-sqlite3 package. If they haven't already, ask the user for the project spec.

        Also, read the guidelines for queries in the doc: ${this.computed().refDoc}`,
    },
    {
      name: "Create the Query Folder",
      prompt: () =>
        `Queries for a given table should live in the path "src/queries/table-name". The "table-name" doesn't have to be the full table name. Create this folder if it doesn't exist.`,
    },
    {
      name: "Add Index, Types, and Errors files",
      prompt: () =>
        `If they don't already exist, add "index.ts", "errors.ts", and "types.ts" to the query folder.`,
    },
    {
      name: "Add types to types.ts",
      prompt: () =>
        `For the queries you're adding, add types for the parameters and return values. As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.`,
    },
    {
      name: "Implement queries",
      prompt: () =>
        `For each query, create a file for it. Make sure to create a "Result" type that uses one of the "types.ts" types for the first argument, and errors from "errors.ts" for the second argument. Add errors to the "errors.ts" file if needed.`,
    },
    {
      name: "Test each query",
      prompt: () =>
        `Write a test file for each query adjacent to the query file, so something like "my-query.test.ts". Don't mock anything; just create a database instance (it will automatically be in memory) per test and test the queries against it. Run "npm run test" after every file is created to make sure it's working.`,
    },
  ];
}
