import {
  buildMonorepoContext,
  getCurrentPackageName,
  type MonorepoContext,
  type packageName,
} from "@saflib/monorepo/workspace";
import type { JSONSchema4 } from "json-schema";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { compile } from "json-schema-to-typescript";

type JSONSchemaStringSchema = JSONSchema4 & {
  type: "string";
  source: string;
};

export interface SimplifiedJSONSchema {
  type: "object";
  properties: Record<string, JSONSchemaStringSchema>;
  required?: string[];
  additionalProperties: false;
}

function emptySchema(): SimplifiedJSONSchema {
  return {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };
}

export function kebabCaseToPascalCase(str: string) {
  const words = str.split("-");
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** Type name for a package's generated env interface, e.g. `@saflib/sentry` → `SentryEnvSchema`. */
export function envSchemaTypeName(packageName: string): string {
  const lastPiece = packageName.split("/").pop()!;
  return `${kebabCaseToPascalCase(lastPiece)}EnvSchema`;
}

export function packageHasEnvFiles(packageDir: string): boolean {
  return (
    existsSync(path.join(packageDir, "env.schema.json")) ||
    existsSync(path.join(packageDir, "env.ts"))
  );
}

/**
 * Direct env-parent packages for `extends` / combined-schema closure.
 * Prefer explicit `package.json` `saf.envExtends` when set; otherwise use direct
 * workspace dependencies that themselves have env.ts / env.schema.json.
 */
export function getDirectEnvParents(
  packageName: packageName,
  context: MonorepoContext,
): packageName[] {
  const packageJson = context.monorepoPackageJsons[packageName];
  const explicitExtends = packageJson?.saf?.envExtends;

  if (explicitExtends !== undefined) {
    for (const parent of explicitExtends) {
      const packagePath = context.monorepoPackageDirectories[parent];
      if (packagePath === undefined) {
        throw new Error(
          `Package ${packageName} saf.envExtends references unknown package ${parent}`,
        );
      }
      if (!packageHasEnvFiles(packagePath)) {
        throw new Error(
          `Package ${packageName} saf.envExtends references ${parent} which has no env.ts / env.schema.json`,
        );
      }
    }
    return [...explicitExtends].sort();
  }

  const directDependencies = context.workspaceDependencyGraph[packageName] ?? [];
  return directDependencies
    .filter((dependency) => {
      const packagePath = context.monorepoPackageDirectories[dependency];
      if (packagePath === undefined) {
        return false;
      }
      return packageHasEnvFiles(packagePath);
    })
    .sort();
}

/**
 * Recursive closure of env parents (not full npm transitive deps), including `packageName`.
 */
export function getEnvParentClosure(
  packageName: packageName,
  context: MonorepoContext,
): Set<packageName> {
  const visited = new Set<packageName>();

  function walk(pkgName: packageName) {
    if (visited.has(pkgName)) {
      return;
    }
    visited.add(pkgName);
    for (const parent of getDirectEnvParents(pkgName, context)) {
      walk(parent);
    }
  }

  walk(packageName);
  return visited;
}

export function loadPackageEnvSchema(
  packageName: packageName,
  context: MonorepoContext,
): SimplifiedJSONSchema | null {
  const packagePath = context.monorepoPackageDirectories[packageName];
  if (packagePath === undefined) {
    throw new Error(`Package ${packageName} not found`);
  }
  const envSchemaPath = path.join(packagePath, "env.schema.json");
  if (!existsSync(envSchemaPath)) {
    return null;
  }
  const schema = JSON.parse(
    readFileSync(envSchemaPath, "utf-8"),
  ) as JSONSchema4;
  if (schema.type !== "object") {
    throw new Error(`Schema for ${packageName} is not an object`);
  }
  return {
    type: "object",
    properties: (schema.properties ?? {}) as Record<
      string,
      JSONSchemaStringSchema
    >,
    required: (schema.required as string[] | undefined) ?? [],
    additionalProperties: false,
  };
}

export function getLocalEnvSchema(
  packageName: packageName,
  context: MonorepoContext,
): SimplifiedJSONSchema {
  return loadPackageEnvSchema(packageName, context) ?? emptySchema();
}

function mergeEnvSchemas(
  schemas: Array<{ packageName: packageName; schema: SimplifiedJSONSchema }>,
): SimplifiedJSONSchema {
  const combinedSchema: SimplifiedJSONSchema = emptySchema();

  for (const { packageName, schema } of schemas) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      if (combinedSchema.properties[key] !== undefined) {
        const withSourceStripped = {
          ...combinedSchema.properties[key],
          source: undefined,
        };
        const incomingWithoutSource = { ...value, source: undefined };
        if (
          JSON.stringify(withSourceStripped) !==
          JSON.stringify(incomingWithoutSource)
        ) {
          throw new Error(`Property ${key} is defined in multiple schemas`);
        }
        return;
      }
      combinedSchema.properties[key] = JSON.parse(JSON.stringify(value));
      combinedSchema.properties[key].source = packageName;
    });
    if (schema.required !== undefined) {
      combinedSchema.required!.push(...schema.required);
    }
  }

  const sortedRequired = Array.from(new Set(combinedSchema.required)).sort();
  const sortedSchema: SimplifiedJSONSchema = {
    type: "object",
    properties: {},
    required: sortedRequired,
    additionalProperties: false,
  };
  for (const property of Object.keys(combinedSchema.properties).sort()) {
    sortedSchema.properties[property] = combinedSchema.properties[property];
  }
  return sortedSchema;
}

/**
 * Combined JSON schema for runtime validation (`env.schema.combined.json`).
 * Follows the env-parent graph (packages with env.ts / env.schema.json), not the
 * full npm transitive dependency closure.
 */
export const getCombinedEnvSchema = async (targetPackageName?: string) => {
  const context = buildMonorepoContext();
  const currentPackageName = targetPackageName ?? getCurrentPackageName();
  const closure = getEnvParentClosure(currentPackageName, context);

  const schemas: Array<{
    packageName: packageName;
    schema: SimplifiedJSONSchema;
  }> = [];
  for (const dependency of Array.from(closure).sort()) {
    const schema = loadPackageEnvSchema(dependency, context);
    if (schema === null) {
      continue;
    }
    schemas.push({ packageName: dependency, schema });
  }

  return mergeEnvSchemas(schemas);
};

export function envTypeImportPath(packageName: string): string {
  return `${packageName}/env`;
}

/**
 * Generate `env.ts`: import parent env interfaces, declare local props only, cast `typedEnv`.
 */
export const makeEnvParserSnippet = async (
  localSchema: SimplifiedJSONSchema,
  packageName: string,
  parentPackageNames: string[] = [],
) => {
  const typeName = envSchemaTypeName(packageName);
  const parents = parentPackageNames.filter((parent) => parent !== packageName);

  const importLines = parents.map((parent) => {
    const parentType = envSchemaTypeName(parent);
    return `import type { ${parentType} } from "${envTypeImportPath(parent)}";`;
  });

  const extendsClause =
    parents.length > 0
      ? ` extends ${parents.map((parent) => envSchemaTypeName(parent)).join(", ")}`
      : "";

  const bannerComment = `/**
 * Environment variables for the \`${packageName}\` package, including inherited variables via \`extends\`.
 * Generated by \`@saflib/env\`. To update, make changes to the adjacent \`env.schema.json\`, navigate to the package root, and run \`npm exec saf-env generate\`.
 */`;

  let interfaceSnippet: string;
  const hasLocalProps = Object.keys(localSchema.properties).length > 0;

  if (!hasLocalProps) {
    interfaceSnippet = `${bannerComment}
export interface ${typeName}${extendsClause} {}
`;
  } else {
    const schemaForCompile: SimplifiedJSONSchema = {
      ...localSchema,
      // Drop source metadata so it does not appear in generated TS docs noise.
      properties: Object.fromEntries(
        Object.entries(localSchema.properties).map(([key, value]) => {
          const { source: _source, ...rest } = value;
          return [key, rest as JSONSchemaStringSchema];
        }),
      ),
    };
    const compiled = await compile(schemaForCompile, typeName, {
      bannerComment: "",
    });
    // json-schema-to-typescript may sanitize the type name (e.g. template
    // placeholders with `__`); rewrite to our name and inject extends.
    interfaceSnippet = `${bannerComment}
${compiled.replace(
  /export interface \w+(\s*\{)/,
  `export interface ${typeName}${extendsClause}$1`,
)}`;
  }

  const importsBlock =
    importLines.length > 0 ? `${importLines.join("\n")}\n\n` : "";

  // In edge cases, this code can appear in browser environments, so the globalThis.process check is for that.
  return `${importsBlock}${interfaceSnippet}
/**
 * \`process.env\` casted to the \`${typeName}\` type.
 */
export const typedEnv = (globalThis.process ? process.env : {}) as unknown as ${typeName};
`;
};
