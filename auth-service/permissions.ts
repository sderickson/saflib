import { readFileSync } from "fs";
import { join } from "path";
import yaml from "yaml";

export interface Permission {
  description: string;
  scopes: string[];
}

export interface PermissionsConfig {
  permissions: Record<string, Permission>;
}

export function loadPermissionsConfig(): PermissionsConfig {
  const configPath = join(__dirname, "config", "permissions.yaml");
  const configContent = readFileSync(configPath, "utf-8");
  return yaml.parse(configContent);
}

export function getPermissionScopes(permission: string): string[] {
  const config = loadPermissionsConfig();
  const permissionConfig = config.permissions[permission];

  if (!permissionConfig) {
    throw new Error(`Permission "${permission}" not found in config`);
  }

  return permissionConfig.scopes;
}

export function hasPermission(
  userPermission: string,
  requiredPermission: string
): boolean {
  const userScopes = getPermissionScopes(userPermission);
  const requiredScopes = getPermissionScopes(requiredPermission);

  // If user has wildcard scope, they have all permissions
  if (userScopes.includes("*")) {
    return true;
  }

  // Check if user has all required scopes
  return requiredScopes.every((scope) => userScopes.includes(scope));
}
