import { getPackageName, SimpleWorkflow } from "@saflib/workflows";
import * as fs from "node:fs";
import * as path from "node:path";

interface AddProtoPackageWorkflowParams {
  name: string;
  path: string; // Relative to monorepo root, e.g., "specs" or "libs"
}

export class AddProtoPackageWorkflow extends SimpleWorkflow<AddProtoPackageWorkflowParams> {
  name = "add-proto-package";
  description =
    "Creates a new Protocol Buffer package according to monorepo best practices.";
  packageName = getPackageName(import.meta.url);
  init = async (name: string, packagePath: string) => {
    this.params = {
      name, // Expected to be the full package name, e.g., @scope/pkg-name
      path: packagePath, // Expected to be the direct path to the package, e.g., specs/pkg-name
    };

    const dirname = path.dirname(import.meta.url);
    const templatesDir = path.join(dirname, "templates");

    if (!fs.existsSync(this.params.path)) {
      fs.mkdirSync(this.params.path, { recursive: true });
    }

    // Create dist directory
    const distDir = path.join(this.params.path, "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Create protos directory
    const protosDir = path.join(this.params.path, "protos");
    if (!fs.existsSync(protosDir)) {
      fs.mkdirSync(protosDir, { recursive: true });
    }

    // Transform npm package name to proto package name
    // @saflib/identity-rpcs -> saflib.auth.v1
    const protoPackageName = this.transformToProtoPackageName(name);

    const filesToCopy = [
      { template: "package.json.template", output: "package.json" },
      { template: "tsconfig.json.template", output: "tsconfig.json" },
      { template: "index.ts.template", output: "index.ts" },
      { template: "generate.sh.template", output: "generate.sh" },
      { template: "README.md.template", output: "README.md" },
      { template: "example.proto.template", output: "protos/example.proto" },
    ];

    for (const file of filesToCopy) {
      const templatePath = path.join(templatesDir, file.template);
      const outputPath = path.join(this.params.path, file.output);
      let content = fs.readFileSync(templatePath, "utf8");
      // Replace template variables
      content = content.replace(/\{\{PACKAGE_NAME\}\}/g, name);
      content = content.replace(
        /\{\{PROTO_PACKAGE_NAME\}\}/g,
        protoPackageName,
      );
      fs.writeFileSync(outputPath, content);
    }

    // Make generate.sh executable
    const generateShPath = path.join(this.params.path, "generate.sh");
    fs.chmodSync(generateShPath, "755");

    return {
      data: {
        fullPackagePath: this.params.path,
        packageName: this.params.name,
        protoPackageName,
      },
    };
  };

  private transformToProtoPackageName(npmPackageName: string): string {
    // Extract scope and package name from @scope/package-name
    const match = npmPackageName.match(/^@([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(
        `Invalid package name format: ${npmPackageName}. Expected @scope/package-name`,
      );
    }

    const [, scope, packageName] = match;

    // Strip -rpcs suffix if present
    let cleanPackageName = packageName;
    if (cleanPackageName.endsWith("-rpcs")) {
      cleanPackageName = cleanPackageName.slice(0, -5); // Remove "-rpcs"
    }

    // Remove hyphens and replace with underscores (or just remove them)
    cleanPackageName = cleanPackageName.replace(/-/g, "");

    return `${scope}.${cleanPackageName}.v1`;
  }

  cliArguments = [
    {
      name: "name",
      description:
        "The desired package name, including scope (e.g., @your-org/package-name-rpcs)",
    },
    {
      name: "path",
      description:
        "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., specs/my-rpcs)",
    },
  ];

  workflowPrompt = () => {
    return `You are creating a new Protocol Buffer package named '${this.params?.name}' at the path '${this.params?.path}'. Follow the steps to set up the package structure, dependencies, and proto generation configuration as per monorepo guidelines.`;
  };

  steps = [
    {
      name: "Update package.json description",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Package path not available. Init might have failed.";
        const packageJsonPath = path.join(this.params.path, "package.json");
        return `The file '${packageJsonPath}' has been created. Please update the "description" field to describe what this proto package contains, and any other fields as needed.`;
      },
    },
    {
      name: "Update proto definitions",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Package path not available. Init might have failed.";
        const protoPath = path.join(this.params.path, "protos/example.proto");
        return `An example proto file '${protoPath}' has been created. Please update it with your actual service definitions, or create additional .proto files as needed. Remember to import "envelope.proto" for SafAuth and SafRequest types.`;
      },
    },
    {
      name: "Ensure package is in root workspace",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Workflow params not available or path is missing.";
        const directPath = this.params.path;
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
      name: "Generate TypeScript code",
      prompt: () => {
        if (!this.params?.path || !this.params?.name)
          return "Error: Package path or name not available. Init might have failed.";
        const workspaceName = this.params.name;
        return `Run 'npm run generate --workspace="${workspaceName}"' to generate TypeScript code from the proto definitions. This will create files in the dist/ directory.`;
      },
    },
    {
      name: "Update index.ts exports",
      prompt: () => {
        if (!this.params?.path)
          return "Error: Package path not available. Init might have failed.";
        const indexPath = path.join(this.params.path, "index.ts");
        return `After generation, update '${indexPath}' to export the generated TypeScript files from the dist/ directory. For example: export * from "./dist/example.ts";`;
      },
    },
  ];
}
