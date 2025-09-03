import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";

export function transformName(
  originalName: string,
  targetName: string,
): string {
  // Handle different naming conventions using utility functions
  const pascalTargetName = kebabCaseToPascalCase(targetName);
  const snakeTargetName = kebabCaseToSnakeCase(targetName);

  let result = originalName;

  // Replace all variations
  result = result.replace(/template-file/g, targetName);
  result = result.replace(/template_file/g, snakeTargetName);
  result = result.replace(/TemplateFile/g, pascalTargetName);

  return result;
}
