import { describe, it, expect } from "vitest";
import {
  loadPermissionsConfig,
  getPermissionScopes,
  hasPermission,
} from "./permissions.ts";

describe("Permissions Config", () => {
  it("loads permissions config successfully", () => {
    const config = loadPermissionsConfig();
    expect(config).toBeDefined();
    expect(config.permissions).toBeDefined();
    expect(config.permissions.admin).toBeDefined();
  });

  it("gets scopes for admin permission", () => {
    const scopes = getPermissionScopes("admin");
    expect(scopes).toContain("*");
  });

  it("throws error for non-existent permission", () => {
    expect(() => getPermissionScopes("non-existent")).toThrow();
  });

  it("correctly checks admin permission", () => {
    expect(hasPermission("admin", "admin")).toBe(true);
  });
});
