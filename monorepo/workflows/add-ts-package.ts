import { SimpleWorkflow } from "@saflib/workflows";
import * as fs from "node:fs";
import * as path from "node:path";

interface AddTsPackageWorkflowParams {
  name: string;
  path: string; // Relative to monorepo root, e.g., "packages" or "libs"
}

export class AddTsPackageWorkflow extends SimpleWorkflow<AddTsPackageWorkflowParams> {
  name = "add-ts-package";
  description =
    "Creates a new TypeScript package according to monorepo best practices.";

  init = async (name: string, packagePath: string) => {
    this.params = {
      name, // Expected to be the full package name, e.g., @scope/pkg-name
      path: packagePath, // Expected to be the direct path to the package, e.g., libs/pkg-name
    };

    const templatesDir = path.join(import.meta.dirname, "templates");

    if (!fs.existsSync(this.params.path)) {
      fs.mkdirSync(this.params.path, { recursive: true });
    }

    const packageDirName = path.basename(this.params.path);

    const filesToCopy = [
      { template: "index.ts.template", output: "index.ts" },
      { template: "vitest.config.js.template", output: "vitest.config.js" },
      { template: "package.json.template", output: "package.json" },
      { template: "test.ts.template", output: `${packageDirName}.test.ts` },
    ];

    for (const file of filesToCopy) {
      const templatePath = path.join(templatesDir, file.template);
      const outputPath = path.join(this.params.path, file.output);
      let content = fs.readFileSync(templatePath, "utf8");
      // Replace {{PACKAGE_NAME}} in vitest.config.js.template with directory name
      content = content.replace(/\{\{PACKAGE_NAME\}\}/g, packageDirName);
      fs.writeFileSync(outputPath, content);
    }

    return {
      data: {
        fullPackagePath: this.params.path,
        packageName: this.params.name,
      },
    };
  };

  cliArguments = [
    {
      name: "name",
      description:
        "The desired package name, including scope (e.g., @your-org/package-name)",
    },
    {
      name: "path",
      description:
        "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., packages/my-lib or saflib/node)",
    },
  ];

  workflowPrompt = () => {
    return `You are creating a new TypeScript package named '${this.params?.name}' at the path '${this.params?.path}'. Follow the steps to set up the package structure, dependencies, and testing configuration as per monorepo guidelines.`;
  };

  steps = [
    {
      name: "Update package.json description",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Package path not available. Init might have failed.";
        const packageJsonPath = path.join(this.params.path, "package.json");
        return `The file '${packageJsonPath}' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.`;
      },
    },
    {
      name: "Ensure package is in root workspace",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Workflow params not available or path is missing.";
        const directPath = this.params.path;
        // Assuming CWD is the monorepo root
        const rootPackageJsonPath = path.join(process.cwd(), "package.json");
        return `Ensure the new package path '${directPath}' is included in the "workspaces" array in '${rootPackageJsonPath}'. For example: "workspaces": ["${directPath}", "other-packages/*"]`;
      },
    },
    {
      name: "Run npm install",
      prompt: () =>
        `Run 'npm install' in the monorepo root directory to link the new package, install dependencies, and update the lockfile.`,
    },
    {
      name: "Verify test setup",
      prompt: () => {
        if (!this.params?.path || !this.params?.name)
          return "Error: Package path or name not available. Init might have failed.";
        const packageDirName = path.basename(this.params.path);
        const testFilePath = path.join(
          this.params.path,
          `${packageDirName}.test.ts`,
        );
        const workspaceName = this.params.name;
        return `A test file '${testFilePath}' has been created. Verify it imports from './index.ts' and tests pass. Run 'npm run test --workspace="${workspaceName}"'. You might need to 'cd ${this.params.path}' then 'npm run test'.`;
      },
    },
  ];
}
