import { parseWorkflowAreaStart } from "./parse.ts";
import { isWorkflowAreaEnd } from "./parse.ts";
import type { WorkflowAreaInfo } from "./types.ts";

/**
 * Extracts all workflow areas from a set of lines.
 * @returns Array of workflow area information, including whether each has a matching END marker
 */
export function extractWorkflowAreas(lines: string[]): WorkflowAreaInfo[] {
  const areas: WorkflowAreaInfo[] = [];
  let currentArea: {
    areaName: string;
    workflowIds: string[];
    isSorted: boolean;
    isOnce: boolean;
    ifFlag: string | undefined;
    startLine: string;
    startIndex: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const areaStart = parseWorkflowAreaStart(line);
    if (areaStart) {
      if (currentArea) {
        areas.push({
          areaName: currentArea.areaName,
          workflowIds: currentArea.workflowIds,
          isSorted: currentArea.isSorted,
          isOnce: currentArea.isOnce,
          ifFlag: currentArea.ifFlag,
          startLine: currentArea.startLine,
          endLine: null,
        });
      }

      currentArea = {
        areaName: areaStart.areaName,
        workflowIds: areaStart.workflowIds,
        isSorted: areaStart.isSorted,
        isOnce: areaStart.isOnce,
        ifFlag: areaStart.ifFlag,
        startLine: areaStart.fullLine,
        startIndex: i,
      };
      continue;
    }

    if (currentArea && isWorkflowAreaEnd(line)) {
      areas.push({
        areaName: currentArea.areaName,
        workflowIds: currentArea.workflowIds,
        isSorted: currentArea.isSorted,
        isOnce: currentArea.isOnce,
        ifFlag: currentArea.ifFlag,
        startLine: currentArea.startLine,
        endLine: line,
      });
      currentArea = null;
    }
  }

  if (currentArea) {
    areas.push({
      areaName: currentArea.areaName,
      workflowIds: currentArea.workflowIds,
      isSorted: currentArea.isSorted,
      isOnce: currentArea.isOnce,
      ifFlag: currentArea.ifFlag,
      startLine: currentArea.startLine,
      endLine: null,
    });
  }

  return areas;
}

/**
 * Creates a unique key for a workflow area based on its properties.
 * Normalizes workflow ID order but preserves comment style for exact matching.
 */
export function getAreaKey(area: WorkflowAreaInfo): string {
  const parsed = parseWorkflowAreaStart(area.startLine);
  if (!parsed) {
    return area.startLine;
  }

  const beginIndex = area.startLine.indexOf("BEGIN");
  const prefix = beginIndex >= 0 ? area.startLine.substring(0, beginIndex) : "";

  const normalizedIds = [...area.workflowIds].sort().join(" ");

  const sortedMarker = area.isSorted ? "SORTED " : "";
  const onceMarker = area.isOnce ? "ONCE " : "";
  const ifPart = area.ifFlag ? ` IF ${area.ifFlag}` : "";
  const normalizedDefinition = `BEGIN ${onceMarker}${sortedMarker}WORKFLOW AREA ${area.areaName} FOR ${normalizedIds}${ifPart}`;

  return `${prefix}${normalizedDefinition}`;
}

/**
 * Validates that source and target files have matching workflow areas.
 * Throws an error if there are any inconsistencies.
 */
export function validateWorkflowAreas({
  sourceLines,
  targetLines,
  targetPath,
  sourcePath,
}: {
  sourceLines: string[];
  targetLines: string[];
  targetPath: string;
  sourcePath: string;
}): void {
  const sourceAreas = extractWorkflowAreas(sourceLines);
  const targetAreas = extractWorkflowAreas(targetLines);
  const errorContext = `
  Source: ${sourcePath}
  Target: ${targetPath}
  `;

  for (const area of sourceAreas) {
    if (area.endLine === null) {
      throw new Error(
        `Source has workflow area "${area.areaName}" without matching END marker${errorContext}`,
      );
    }
  }

  for (const area of targetAreas) {
    if (area.endLine === null) {
      throw new Error(
        `Target has workflow area "${area.areaName}" without matching END marker${errorContext}`,
      );
    }
  }

  const sourceAreaMap = new Map<string, WorkflowAreaInfo>();
  const targetAreaMap = new Map<string, WorkflowAreaInfo>();

  for (const area of sourceAreas) {
    const key = getAreaKey(area);
    if (sourceAreaMap.has(key)) {
      throw new Error(
        `Source has duplicate workflow area "${area.areaName}"${errorContext}`,
      );
    }
    sourceAreaMap.set(key, area);
  }

  for (const area of targetAreas) {
    const key = getAreaKey(area);
    if (targetAreaMap.has(key)) {
      throw new Error(
        `Target has duplicate workflow area "${area.areaName}"${errorContext}`,
      );
    }
    targetAreaMap.set(key, area);
  }

  for (const [key, area] of sourceAreaMap) {
    if (!targetAreaMap.has(key)) {
      // ONCE areas are intentionally removed from the target after resolution
      if (area.isOnce) continue;
      throw new Error(
        `Source has workflow area "${area.areaName}" (${area.isSorted ? "SORTED " : ""}${area.isOnce ? "ONCE " : ""}FOR ${area.workflowIds.join(" ")}${area.ifFlag ? ` IF ${area.ifFlag}` : ""}) that target does not have${errorContext}`,
      );
    }
  }

  for (const [key, area] of targetAreaMap) {
    if (!sourceAreaMap.has(key)) {
      throw new Error(
        `Target has workflow area "${area.areaName}" (${area.isSorted ? "SORTED " : ""}${area.isOnce ? "ONCE " : ""}FOR ${area.workflowIds.join(" ")}${area.ifFlag ? ` IF ${area.ifFlag}` : ""}) that source does not have${errorContext}`,
      );
    }
  }

  for (const [key, sourceArea] of sourceAreaMap) {
    const targetArea = targetAreaMap.get(key);
    // ONCE areas may be missing in target (removed after resolution); skip comparison
    if (!targetArea) continue;

    if (sourceArea.areaName !== targetArea.areaName) {
      throw new Error(
        `Workflow area name mismatch: source has "${sourceArea.areaName}" but target has "${targetArea.areaName}"${errorContext}`,
      );
    }

    if (sourceArea.isSorted !== targetArea.isSorted) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" sorted status mismatch: source is ${sourceArea.isSorted ? "SORTED" : "not sorted"} but target is ${targetArea.isSorted ? "SORTED" : "not sorted"}${errorContext}`,
      );
    }

    if (sourceArea.isOnce !== targetArea.isOnce) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" ONCE mismatch: source is ${sourceArea.isOnce ? "ONCE" : "not ONCE"} but target is ${targetArea.isOnce ? "ONCE" : "not ONCE"}${errorContext}`,
      );
    }

    if (sourceArea.ifFlag !== targetArea.ifFlag) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" IF flag mismatch: source has ${sourceArea.ifFlag ?? "none"} but target has ${targetArea.ifFlag ?? "none"}${errorContext}`,
      );
    }

    const sourceIds = [...sourceArea.workflowIds].sort();
    const targetIds = [...targetArea.workflowIds].sort();
    if (
      sourceIds.length !== targetIds.length ||
      sourceIds.some((id, i) => id !== targetIds[i])
    ) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" workflow IDs mismatch: source has [${sourceIds.join(", ")}] but target has [${targetIds.join(", ")}]${errorContext}`,
      );
    }
  }
}
