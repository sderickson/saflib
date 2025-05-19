import { SimpleWorkflow } from "@saflib/workflows";
import path from "path";
import { existsSync } from "fs";

interface AddQueriesWorkflowParams {}

export class AddQueriesWorkflow extends SimpleWorkflow<AddQueriesWorkflowParams> {
  name = "add-queries-old";
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
    const testingGuide = path.resolve(
      import.meta.dirname,
      "../../drizzle-sqlite3-dev/docs/01-testing-guide.md",
    );
    const testingGuideAbsPath = path.resolve(process.cwd(), testingGuide);
    if (!existsSync(testingGuideAbsPath)) {
      throw new Error(`Testing guide not found: ${testingGuideAbsPath}`);
    }
    return { refDoc: refDocAbsPath, testingGuide: testingGuideAbsPath };
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
        `Queries for a given table should live in the path "queries/table-name". The "table-name" doesn't have to be the full table name. Create this folder if it doesn't exist, as well as an "index.ts" file.`,
    },
    {
      name: "Add types to root types.ts",
      prompt: () =>
        `For the queries you're adding, add types for the parameters and return values to the main "types.ts" file. As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.`,
    },
    {
      name: "Implement queries",
      prompt: () =>
        `For each query, create a file for it. Make sure to create a "Result" type that uses one of the types from "@your-project/db-package" (since the package you're in exports the types) for the first argument, and specific error subclasses from "@your-project/db-package/errors" (the local errors file) for the second argument. Add errors to "errors.ts" file if needed.`,
    },
    {
      name: "Export the queries",
      prompt: () => `Export the queries from the folder's "index.ts" file.`,
    },
    {
      name: "Review Docs",
      prompt: () => `Read the testing guide: ${this.computed().testingGuide}`,
    },
    {
      name: "Test each query",
      prompt: () =>
        `Write a test file for each query adjacent to the query file, so something like "my-query.test.ts". Don't mock anything; just create a database instance (it will automatically be in memory) per test and test the queries against it. Don't import files directly, instead import the package and use the functions from there, to ensure what is tested is what is exported. Run "npm run test" after every file is created to make sure it's working.`,
    },
  ];
}
