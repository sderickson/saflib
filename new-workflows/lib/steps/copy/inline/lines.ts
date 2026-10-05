import { sequenceExists } from "./find.ts";

/**
 * Gets new lines for non-sorted areas. If the entire sequence of transformed lines
 * already exists consecutively in the target, returns empty array. Otherwise, returns all transformed lines.
 */
export function getNewLinesForNonSorted(
  workflowAreaLines: string[],
  existingAreaContent: string[],
  lineReplace: (line: string) => string,
): string[] {
  const transformedLines = workflowAreaLines.map(lineReplace);

  if (sequenceExists(transformedLines, existingAreaContent)) {
    return [];
  }

  return transformedLines;
}

/**
 * Gets new lines for sorted areas. Deduplicates individual lines that already exist.
 */
export function getNewLinesForSorted(
  workflowAreaLines: string[],
  existingAreaContent: string[],
  lineReplace: (line: string) => string,
): string[] {
  const transformedLines = workflowAreaLines.map(lineReplace);
  const seen = new Set<string>(existingAreaContent);
  const newLines: string[] = [];

  for (const line of transformedLines) {
    if (!seen.has(line)) {
      seen.add(line);
      newLines.push(line);
    }
  }

  return newLines;
}
