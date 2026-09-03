import { type MonorepoContext, type packageName } from "@saflib/monorepo/workspace";
import type { JSONSchema4 } from "json-schema";
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
export declare function kebabCaseToPascalCase(str: string): string;
/** Type name for a package's generated env interface, e.g. `@saflib/sentry` → `SentryEnvSchema`. */
export declare function envSchemaTypeName(packageName: string): string;
export declare function packageHasEnvFiles(packageDir: string): boolean;
/**
 * Direct env-parent packages for `extends` / combined-schema closure: workspace
 * dependencies that have `env.ts` / `env.schema.json`.
 */
export declare function getDirectEnvParents(packageName: packageName, context: MonorepoContext): packageName[];
/**
 * Recursive closure of env parents (not full npm transitive deps), including `packageName`.
 */
export declare function getEnvParentClosure(packageName: packageName, context: MonorepoContext): Set<packageName>;
export declare function loadPackageEnvSchema(packageName: packageName, context: MonorepoContext): SimplifiedJSONSchema | null;
export declare function getLocalEnvSchema(packageName: packageName, context: MonorepoContext): SimplifiedJSONSchema;
/**
 * Combined JSON schema for runtime validation (`env.schema.combined.json`).
 * Follows the env-parent graph (packages with env.ts / env.schema.json), not the
 * full npm transitive dependency closure.
 */
export declare const getCombinedEnvSchema: (targetPackageName?: string) => Promise<SimplifiedJSONSchema>;
export declare function envTypeImportPath(packageName: string): string;
/**
 * Generate `env.ts`: import parent env interfaces, declare local props only, cast `typedEnv`.
 */
export declare const makeEnvParserSnippet: (localSchema: SimplifiedJSONSchema, packageName: string, parentPackageNames?: string[]) => Promise<string>;
export {};
//# sourceMappingURL=env.d.ts.map