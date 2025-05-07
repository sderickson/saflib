import { SimpleWorkflow } from "@saflib/workflows";
import * as fs from "node:fs";
import * as path from "node:path";

interface AddTsPackageWorkflowParams {
  name: string;
  packagePath: string; // Relative to monorepo root, e.g., "packages" or "libs"
}

export class AddTsPackageWorkflow extends SimpleWorkflow<AddTsPackageWorkflowParams> {
  name = "add-ts-package";
  description =
    "Creates a new TypeScript package according to monorepo best practices.";

  // Store results from init for use in prompts
  private fullPackagePath: string | undefined;
  private effectivePackageName: string | undefined;

  init = async (name: string, packagePath: string) => {
    this.params = {
      name,
      packagePath,
    };

    this.fullPackagePath = path.join(this.params.packagePath, this.params.name);
    this.effectivePackageName = this.params.name; // Default

    const templatesDir = path.join(import.meta.dirname, "templates");

    if (
      this.params.packagePath !== "" &&
      this.params.packagePath !== "." &&
      !fs.existsSync(this.params.packagePath)
    ) {
      fs.mkdirSync(this.params.packagePath, { recursive: true });
    }
    if (!fs.existsSync(this.fullPackagePath)) {
      fs.mkdirSync(this.fullPackagePath, { recursive: true });
    }

    const filesToCopy = [
      { template: "index.ts.template", output: "index.ts" },
      { template: "vitest.config.js.template", output: "vitest.config.js" },
    ];

    for (const file of filesToCopy) {
      const templatePath = path.join(templatesDir, file.template);
      const outputPath = path.join(this.fullPackagePath, file.output);
      let content = fs.readFileSync(templatePath, "utf8");
      content = content.replace(/\{\{PACKAGE_NAME\}\}/g, this.params.name);
      fs.writeFileSync(outputPath, content);
    }

    const packageJsonTemplatePath = path.join(
      templatesDir,
      "package.json.template",
    );
    const packageJsonOutputPath = path.join(
      this.fullPackagePath,
      "package.json",
    );
    let packageJsonContent = fs.readFileSync(packageJsonTemplatePath, "utf8");

    if (
      this.params.packagePath === "packages" ||
      this.params.packagePath === "libs" ||
      this.params.packagePath === "services"
    ) {
      if (!this.params.name.includes("/")) {
        try {
          const rootPackageJsonPath = path.resolve(
            process.cwd(),
            "package.json",
          );
          if (fs.existsSync(rootPackageJsonPath)) {
            const rootPackageJson = JSON.parse(
              fs.readFileSync(rootPackageJsonPath, "utf-8"),
            );
            const orgScope = rootPackageJson.name?.split("/")[0];
            if (orgScope && orgScope.startsWith("@")) {
              this.effectivePackageName = `${orgScope}/${this.params.name}`;
            }
          }
        } catch (e) {
          console.warn(
            "Could not read root package.json to determine scope",
            e,
          );
        }
      }
    }
    packageJsonContent = packageJsonContent.replace(
      /\{\{PACKAGE_NAME\}\}/g,
      this.effectivePackageName,
    );
    fs.writeFileSync(packageJsonOutputPath, packageJsonContent);

    const testFileTemplatePath = path.join(templatesDir, "test.ts.template");
    const testFileOutputPath = path.join(
      this.fullPackagePath,
      `${this.params.name}.test.ts`,
    );
    let testFileContent = fs.readFileSync(testFileTemplatePath, "utf8");
    fs.writeFileSync(testFileOutputPath, testFileContent);

    // init doesn't strictly need to return these if they are stored on this, but can be useful for external access to init's results
    return {
      data: {
        fullPackagePath: this.fullPackagePath,
        packageName: this.effectivePackageName,
      },
    };
  };

  cliArguments = [
    {
      name: "name",
      description: "The name of the new package (e.g., my-new-lib)",
    },
    {
      name: "packagePath",
      description:
        "The RELATIVE path from monorepo root where the package directory will be created (e.g., packages, services, or '.' for root)",
    },
  ];

  workflowPrompt = () => {
    return `You are creating a new TypeScript package named '${this.params?.name ?? "<unknown_name>"}' (resolved to '${this.effectivePackageName ?? this.params?.name ?? "<unknown_name>"}') within the directory '${this.params?.packagePath ?? "<unknown_path>"}'. Follow the steps to set up the package structure, dependencies, and testing configuration as per monorepo guidelines.`;
  };

  steps = [
    {
      name: "Update package.json description",
      prompt: () => {
        if (!this.fullPackagePath)
          return "Error: Package path not available. Init might have failed.";
        const packageJsonPath = path.join(this.fullPackagePath, "package.json");
        return `The file '${packageJsonPath}' has been created with a template. Please update the \"description\" field in this file to accurately describe the package. The current package name is set to \"${this.effectivePackageName ?? this.params?.name ?? "<unknown_name>"}\".`;
      },
    },
    {
      name: "Ensure package is in root workspace",
      prompt: () => {
        if (!this.params) return "Error: Workflow params not available.";
        const packageDir =
          this.params.packagePath === "."
            ? this.params.name
            : path.join(this.params.packagePath, this.params.name);
        return `Ensure the new package directory ('${packageDir}' or a glob pattern like '${this.params.packagePath}/*') is included in the \"workspaces\" array in the root package.json file of the monorepo. This allows npm/yarn to recognize and link the package.`;
      },
    },
    {
      name: "Run npm install",
      prompt: () =>
        `Run 'npm install' in the monorepo root directory. This will link the new package, install its dependencies (@saflib/vitest), and update the lockfile.`,
    },
    {
      name: "Verify test setup",
      prompt: () => {
        if (!this.fullPackagePath || !this.params?.name)
          return "Error: Package path or name not available. Init might have failed.";
        const testFilePath = path.join(
          this.fullPackagePath,
          `${this.params.name}.test.ts`,
        );
        return `A test file '${testFilePath}' has been created with basic tests. Verify that it correctly imports from './index.ts' and that the tests pass by running 'npm run test --workspace=${this.effectivePackageName ?? this.params?.name}'. You might need to 'cd ${this.fullPackagePath}' and then 'npm run test' if workspace specific commands are not set up at root.`;
      },
    },
  ];
}
