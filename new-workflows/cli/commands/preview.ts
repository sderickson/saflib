import { execFileSync } from "node:child_process";
import { resolveRef } from "@saflib/git";
import {
  previewRun,
  loadWorkflowDefinition,
  isExpectedPreviewSkip,
  isMechanicalPreviewFailure,
  type PreviewFileChange,
} from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";
import { cliCwd } from "../cli-cwd.ts";

/**
 * A file can appear in more than one step's `files` list (e.g. added by one
 * step, then modified by a later step) — collapse to one entry per path,
 * `added` winning over `modified`.
 */
function dedupeFiles(files: PreviewFileChange[]): PreviewFileChange[] {
  const byPath = new Map<string, PreviewFileChange["status"]>();
  for (const f of files) {
    if (byPath.get(f.path) !== "added") byPath.set(f.path, f.status);
  }
  return [...byPath.entries()]
    .map(([path, status]) => ({ path, status }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

interface TreeNode {
  name: string;
  status?: PreviewFileChange["status"];
  children: Map<string, TreeNode>;
}

function buildTree(files: PreviewFileChange[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const isLeaf = i === parts.length - 1;
      let child = node.children.get(parts[i]);
      if (!child) {
        child = { name: parts[i], children: new Map() };
        node.children.set(parts[i], child);
      }
      if (isLeaf) child.status = file.status;
      node = child;
    }
  }
  return root;
}

function renderTree(root: TreeNode, prefix = ""): string[] {
  const lines: string[] = [];
  const children = [...root.children.values()];
  children.forEach((child, i) => {
    const isLast = i === children.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const isDir = child.children.size > 0;
    const marker = isDir ? "" : child.status === "added" ? "+ " : "~ ";
    const label = isDir ? `${child.name}/` : child.name;
    lines.push(`${prefix}${connector}${marker}${label}`);
    if (isDir) {
      lines.push(...renderTree(child, prefix + (isLast ? "    " : "│   ")));
    }
  });
  return lines;
}

function findRepoRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function addPreviewCommand(ctx: CliContext): void {
  ctx.program
    .command("preview")
    .allowUnknownOption(true)
    .description(
      "Preview a workflow's copy/transform-file steps against the repo's current commit: " +
        "lists which files would be added or modified, without running anything for real.",
    )
    .argument("<id-or-path>", "Workflow id, or path to a workflow file")
    .argument("[args...]", "Named args for the workflow (--key=value)")
    .action(async (idOrPath: string, args: string[]) => {
      const cwd = cliCwd();
      const repoRoot = findRepoRoot(cwd);
      const definition = await loadWorkflowDefinition(idOrPath, ctx.registry, { cwd });
      const input = parseNamedArgs(args, definition.inputSchema);

      const { result: baseHash, error: refError } = resolveRef(repoRoot, "HEAD");
      if (refError) {
        console.error(`!!! ${refError.message}`);
        process.exitCode = 1;
        return;
      }

      const result = await previewRun(ctx.dbKey, definition, input, {
        repoRoot,
        baseHash: baseHash!,
        cwd,
      });

      const errors = result.entries.filter(isMechanicalPreviewFailure);
      const skipped = result.entries.filter((e) => !e.applied && isExpectedPreviewSkip(e));
      const applied = result.entries.filter((e) => e.applied && e.files);

      const allFiles = applied.flatMap((e) => e.files!);
      const files = dedupeFiles(allFiles);

      if (files.length > 0) {
        for (const line of renderTree(buildTree(files))) console.log(line);
      } else {
        console.log("No previewable file changes.");
      }
      if (skipped.length > 0) {
        console.log(
          `\n${skipped.length} step(s) need a real run to preview: ` +
            skipped.map((e) => `${e.kind} (${e.workflowId}, step ${e.stepIndex})`).join(", "),
        );
      }

      if (errors.length > 0) {
        console.error("\n!!! Preview failed:");
        for (const e of errors) {
          console.error(`  ${e.kind} (${e.workflowId}, step ${e.stepIndex}): ${e.reason}`);
        }
        process.exitCode = 1;
      }
    });
}
