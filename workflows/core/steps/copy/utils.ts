import {
  kebabCaseToPascalCase,
  kebabCaseToSnakeCase,
} from "../../../strings.ts";

export function transformName(
  originalName: string,
  targetName?: string,
  lineReplace?: (str: string) => string,
): string {
  // Handle different naming conventions using utility functions
  let result = originalName;

  if (targetName) {
    const pascalTargetName = kebabCaseToPascalCase(targetName);
    const snakeTargetName = kebabCaseToSnakeCase(targetName);

    // Replace all variations
    result = result.replace(/template-file/g, targetName);
    result = result.replace(/template_file/g, snakeTargetName);
    result = result.replace(/TemplateFile/g, pascalTargetName);
  }

  if (lineReplace) {
    result = lineReplace(result);
  }

  return result;
}
