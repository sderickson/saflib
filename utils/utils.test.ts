import { describe, it, expect } from "vitest";
import {
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
  kebabCaseToSnakeCase,
} from "./index.ts";

describe("Naming convention utilities", () => {
  it("should convert kebab-case to PascalCase", () => {
    expect(kebabCaseToPascalCase("foo-bar")).toBe("FooBar");
    expect(kebabCaseToPascalCase("hello-world-test")).toBe("HelloWorldTest");
    expect(kebabCaseToPascalCase("single")).toBe("Single");
  });

  it("should convert kebab-case to camelCase", () => {
    expect(kebabCaseToCamelCase("foo-bar")).toBe("fooBar");
    expect(kebabCaseToCamelCase("hello-world-test")).toBe("helloWorldTest");
    expect(kebabCaseToCamelCase("single")).toBe("single");
  });

  it("should convert kebab-case to snake_case", () => {
    expect(kebabCaseToSnakeCase("foo-bar")).toBe("foo_bar");
    expect(kebabCaseToSnakeCase("hello-world-test")).toBe("hello_world_test");
    expect(kebabCaseToSnakeCase("single")).toBe("single");
  });
});
