import { getCurrentPackageName, type MonorepoContext } from "../workspace.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function generateEnvDocs(monorepoContext: MonorepoContext) {
  const currentPackage = getCurrentPackageName();
  const currentPackageDir =
    monorepoContext.monorepoPackageDirectories[currentPackage];

  const envSchemaPath = join(currentPackageDir, "env.schema.json");
  if (existsSync(envSchemaPath)) {
    console.log("\nGenerating env.md...");
    mkdirSync("docs/env", { recursive: true });
    const envSchema = JSON.parse(readFileSync(envSchemaPath, "utf8"));

    const envTable = makeMdTableFromEnvSchema(envSchema);

    const envMd = `# Environment Variables\n\nThis package uses environment variables. The schema for these variables is as follows:\n\n${envTable}\n`;
    writeFileSync("docs/env/index.md", envMd);
    console.log("Finished generating env.md at ./docs/env/index.md");
  }
}

interface EnvSchemaEntry {
  variable: string;
  description: string;
  type: string;
  required: boolean;
}

interface EnvSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description: string;
    }
  >;
  required: string[];
}

const makeMdTableFromEnvSchema = (envSchema: EnvSchema) => {
  const variables: EnvSchemaEntry[] = [];

  const required = new Set<string>(envSchema.required || []);

  for (const [key, value] of Object.entries(envSchema.properties)) {
    variables.push({
      variable: key,
      description: value.description,
      type: value.type,
      required: required.has(key),
    });
  }

  return `| Variable | Description | Type | Required |\n| --- | --- | --- | --- |\n${variables
    .map((variable) => {
      return `| ${variable.variable} | ${variable.description} | ${variable.type} | ${variable.required ? "Yes" : ""} |\n`;
    })
    .join("")}`;
};
