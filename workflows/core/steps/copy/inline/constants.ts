/**
 * Regex pattern to match the start of a workflow area.
 * Matches: "BEGIN WORKFLOW AREA <name> FOR <workflowIds>" with optional SORTED, ONCE, and IF <flag>.
 * Groups: [1] = "ONCE" or undefined, [2] = "SORTED " or undefined, [3] = area name, [4] = workflow IDs (space-separated), [5] = flag name or undefined
 */
export const WORKFLOW_AREA_START_REGEX =
  /^.*BEGIN (?:(ONCE) )?(?:(SORTED) )?WORKFLOW AREA (.*?) FOR (.*?)(?: IF (\w+))?\s*$/;

/**
 * Regex pattern to match the end of a workflow area.
 * Matches: "END WORKFLOW AREA" (with any prefix/suffix for comments)
 */
export const WORKFLOW_AREA_END_REGEX = /^.*END WORKFLOW AREA.*$/;

/**
 * Regex pattern to match the ELSE branch marker inside a workflow area.
 * Matches: "ELSE" (with any comment prefix, e.g. "# ELSE")
 */
export const WORKFLOW_AREA_ELSE_REGEX = /^.*#?\s*ELSE\s*$/;
