import type { CliContext } from "../types.ts";

/**
 * Lists everything in the registry passed to `runNewWorkflowCli`. Unlike the
 * old CLI's `list.ts`, this doesn't yet filter to "workflows belonging to
 * the current package" — that relied on each workflow's `sourceUrl`, which
 * Phase 2's engine doesn't carry (no real per-package workflow files exist
 * yet to filter across). Revisit once Phase 5 ports real platform workflows.
 */
export function addListCommand(ctx: CliContext): void {
  ctx.program
    .command("list")
    .option("-d, --details", "Show each workflow's input schema")
    .description("List all registered workflows.")
    .action((options: { details?: boolean }) => {
      const sorted = [...ctx.registry].sort((a, b) => a.id.localeCompare(b.id));
      const longestId = sorted.reduce((max, w) => Math.max(max, w.id.length), 0);
      for (const workflow of sorted) {
        const id = workflow.id.padEnd(longestId, " ");
        console.log(`${id}  ${workflow.description}`);
        if (options.details && workflow.inputSchema) {
          for (const [name, prop] of Object.entries(workflow.inputSchema.properties)) {
            const required = workflow.inputSchema.required?.includes(name) ? " (required)" : "";
            console.log(`  --${name} (${prop.type})${required}${prop.description ? `: ${prop.description}` : ""}`);
          }
        }
      }
    });
}
