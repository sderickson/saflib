/**
 * Finds the start and end indices of a workflow area in the target file.
 * @returns Object with start and end indices, or null if not found
 */
export function findTargetAreaIndices(
  result: string[],
  areaStartLine: string,
  areaEndLine: string,
  areaName: string,
  targetPath: string,
): { start: number; end: number } | null {
  const targetAreaStart = result.findIndex((line) => line === areaStartLine);

  if (targetAreaStart === -1) {
    console.warn(`Could not find target area ${areaName} in ${targetPath}`);
    return null;
  }

  const targetAreaEnd = result.findIndex(
    (line, index) => index > targetAreaStart && line === areaEndLine,
  );

  if (targetAreaEnd === -1) {
    console.warn(`Target area ${areaName} does not end in ${targetPath}`);
    return null;
  }

  return { start: targetAreaStart, end: targetAreaEnd };
}

/**
 * Checks if a sequence of lines exists consecutively in the target area.
 * @returns true if the entire sequence exists in order and uninterrupted
 */
export function sequenceExists(sequence: string[], target: string[]): boolean {
  if (sequence.length === 0) {
    return true;
  }
  if (sequence.length > target.length) {
    return false;
  }

  for (let i = 0; i <= target.length - sequence.length; i++) {
    let matches = true;
    for (let j = 0; j < sequence.length; j++) {
      if (target[i + j] !== sequence[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }

  return false;
}
