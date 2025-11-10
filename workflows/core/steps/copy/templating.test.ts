import { describe, it, expect } from "vitest";
import {
  parsePackageName,
  parsePath,
  makeLineReplace,
  type ParsePackageNameInput,
  type ParsePathInput,
} from "./templating.ts";

describe("templating", () => {
  describe("parsePackageName", () => {
    it("should parse simple package name without organization", () => {
      const result = parsePackageName("identity");

      expect(result).toEqual({
        packageName: "identity",
        serviceName: "identity",
        organizationName: "",
        sharedPackagePrefix: "identity",
      });
    });

    it("should parse scoped package name", () => {
      const result = parsePackageName("@foobar/identity");

      expect(result).toEqual({
        packageName: "@foobar/identity",
        serviceName: "identity",
        organizationName: "@foobar",
        sharedPackagePrefix: "@foobar/identity",
      });
    });

    it("should parse package name with required suffix", () => {
      const input: ParsePackageNameInput = { requiredSuffix: "-db" };
      const result = parsePackageName("@foobar/identity-db", input);

      expect(result).toEqual({
        packageName: "@foobar/identity-db",
        serviceName: "identity",
        organizationName: "@foobar",
        sharedPackagePrefix: "@foobar/identity",
      });
    });

    it("should parse simple package name with required suffix", () => {
      const input: ParsePackageNameInput = { requiredSuffix: "-db" };
      const result = parsePackageName("identity-db", input);

      expect(result).toEqual({
        packageName: "identity-db",
        serviceName: "identity",
        organizationName: "",
        sharedPackagePrefix: "identity",
      });
    });

    it("should throw error when required suffix doesn't start with -", () => {
      const input: ParsePackageNameInput = { requiredSuffix: "db" };

      expect(() => parsePackageName("identity-db", input)).toThrow(
        "Required suffix must start with -: db",
      );
    });

    it("should throw error for invalid package name with too many parts", () => {
      expect(() => parsePackageName("@foobar/identity/extra")).toThrow(
        "Invalid package name: @foobar/identity/extra",
      );
    });

    it("should handle empty input object", () => {
      const result = parsePackageName("identity", {});

      expect(result).toEqual({
        packageName: "identity",
        serviceName: "identity",
        organizationName: "",
        sharedPackagePrefix: "identity",
      });
    });

    it("should handle undefined input", () => {
      const result = parsePackageName("identity");

      expect(result).toEqual({
        packageName: "identity",
        serviceName: "identity",
        organizationName: "",
        sharedPackagePrefix: "identity",
      });
    });
  });

  describe("parsePath", () => {
    const baseInput: ParsePathInput = {
      cwd: "/absolute/path",
    };

    it("should parse simple path without prefix or suffix", () => {
      const result = parsePath("target-name", baseInput);

      expect(result).toEqual({
        groupName: "target-name",
        targetName: "target-name",
        targetDir: "/absolute/path",
      });
    });

    it("should parse path with group and target", () => {
      const result = parsePath("group-name/target-name", baseInput);

      expect(result).toEqual({
        groupName: "group-name",
        targetName: "target-name",
        targetDir: "/absolute/path/group-name",
      });
    });

    it("should parse path with required prefix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredPrefix: "./queries/",
      };
      const result = parsePath("./queries/contacts/get-by-id", input);

      expect(result).toEqual({
        groupName: "contacts",
        targetName: "get-by-id",
        targetDir: "/absolute/path/queries/contacts",
      });
    });

    it("should parse path with required suffix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredSuffix: ".ts",
      };
      const result = parsePath("contacts/get-by-id.ts", input);

      expect(result).toEqual({
        groupName: "contacts",
        targetName: "get-by-id",
        targetDir: "/absolute/path/contacts",
      });
    });

    it("should parse path with both prefix and suffix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
      };
      const result = parsePath("./queries/contacts/get-by-id.ts", input);

      expect(result).toEqual({
        groupName: "contacts",
        targetName: "get-by-id",
        targetDir: "/absolute/path/queries/contacts",
      });
    });

    it("should throw error when required prefix doesn't start with ./", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredPrefix: "queries/",
      };

      expect(() => parsePath("./queries/target", input)).toThrow(
        `Required prefix must start with ./. Given: "queries/"`,
      );
    });

    it("should throw error when path doesn't start with required prefix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredPrefix: "./queries/",
      };

      expect(() => parsePath("./other/target", input)).toThrow(
        "Path must start with ./queries/",
      );
    });

    it("should throw error when required suffix doesn't start with .", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredSuffix: "ts",
      };

      expect(() => parsePath("./target.ts", input)).toThrow(
        `Required suffix must start with ".". Given: "ts"`,
      );
    });

    it("should throw error when path doesn't end with required suffix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredSuffix: ".ts",
      };

      expect(() => parsePath("./target.js", input)).toThrow(
        "Path must end with .ts",
      );
    });

    it("should throw error for invalid path with too many parts", () => {
      expect(() => parsePath("./a/b/c/d", baseInput)).toThrow(
        "Invalid path: ./a/b/c/d",
      );
    });

    it("should handle path with only target name and prefix/suffix", () => {
      const input: ParsePathInput = {
        ...baseInput,
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
      };
      const result = parsePath("./queries/target-name.ts", input);

      expect(result).toEqual({
        groupName: "target-name",
        targetName: "target-name",
        targetDir: "/absolute/path/queries",
      });
    });
  });

  describe("makeLineReplace", () => {
    it("should replace kebab-case variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace(
        "import { __service-name__ } from './__service-name__'",
      );

      expect(result).toBe("import { identity-db } from './identity-db'");
    });

    it("should replace camelCase variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const __serviceName__ = '__serviceName__'");

      expect(result).toBe("const identityDb = 'identityDb'");
    });

    it("should replace snake_case variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const __service_name__ = '__service_name__'");

      expect(result).toBe("const identity_db = 'identity_db'");
    });

    it("should replace PascalCase variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("class __ServiceName__ {}");

      expect(result).toBe("class IdentityDb {}");
    });

    it("should replace SNAKE_CASE variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const __SERVICE_NAME__ = '__SERVICE_NAME__'");

      expect(result).toBe("const IDENTITY_DB = 'IDENTITY_DB'");
    });

    it("should handle multiple variables in one line", () => {
      const context = { serviceName: "identity-db", targetName: "get-by-id" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace(
        "export const __targetName__ = (__serviceName__) => {}",
      );

      expect(result).toBe("export const getById = (identityDb) => {}");
    });

    it("should handle template-package replacement", () => {
      const context = { sharedPackagePrefix: "@foobar/identity" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("import from 'template-package'");

      expect(result).toBe("import from '@foobar/identity'");
    });

    it("should handle mixed template-package and variable replacements", () => {
      const context = {
        sharedPackagePrefix: "@foobar/identity",
        serviceName: "identity-db",
      };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace(
        "import { __serviceName__ } from 'template-package'",
      );

      expect(result).toBe("import { identityDb } from '@foobar/identity'");
    });

    it("should ignore non-string context values", () => {
      const context = {
        serviceName: "identity-db",
        version: 1,
        enabled: true,
        config: { key: "value" },
      };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const __serviceName__ = '__serviceName__'");

      expect(result).toBe("const identityDb = 'identityDb'");
    });

    it("should throw error for missing replacement", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      expect(() => lineReplace("const __missingVar__ = 'test'")).toThrow(
        "Missing replacement for __missingVar__",
      );
    });

    it("should handle empty context", () => {
      const context = {};
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const test = 'hello'");

      expect(result).toBe("const test = 'hello'");
    });

    it("should handle line with no variables", () => {
      const context = { serviceName: "identity-db" };
      const lineReplace = makeLineReplace(context);

      const result = lineReplace("const test = 'hello world'");

      expect(result).toBe("const test = 'hello world'");
    });

    it("should handle complex real-world example", () => {
      const context = {
        serviceName: "user-management",
        targetName: "create-user",
        sharedPackagePrefix: "@company/user-management",
      };
      const lineReplace = makeLineReplace(context);

      const template = `
import { __TargetName__ } from 'template-package';
import { __service_name__ } from './__service-name__';

export const __targetName__ = async (data: __TargetName__Data) => {
  return await __serviceName__.create(data);
};
`;

      const expected = `
import { CreateUser } from '@company/user-management';
import { user_management } from './user-management';

export const createUser = async (data: CreateUserData) => {
  return await userManagement.create(data);
};
`;

      const result = lineReplace(template);

      expect(result).toBe(expected);
    });
  });
});
