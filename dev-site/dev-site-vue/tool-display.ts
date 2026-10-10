/**
 * Human-readable labels for agent tool calls / results in the run log UI.
 */

export type ToolInvocationDisplay = {
  title: string;
  /** Secondary line (path, command, pattern, …). */
  detail?: string;
  /** When true, skip a separate "Full input" section — detail is enough. */
  inputIsRedundant?: boolean;
};

export type ToolResultSection = {
  label: string;
  body: string;
};

const REPO_PREFIX = "/repo/";

export function shortenRepoPath(filePath: string): string {
  return filePath.startsWith(REPO_PREFIX) ? filePath.slice(REPO_PREFIX.length) : filePath;
}

export function formatToolInvocation(name: string, input: unknown): ToolInvocationDisplay {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    const filePath =
      typeof record.file_path === "string"
        ? record.file_path
        : typeof record.path === "string"
          ? record.path
          : undefined;
    if (filePath && (name === "Read" || name === "Write" || name === "Edit")) {
      return {
        title: name,
        detail: shortenRepoPath(filePath),
        inputIsRedundant: Object.keys(record).length === 1,
      };
    }
    if (name === "Bash" && typeof record.command === "string") {
      return { title: "Bash", detail: record.command };
    }
    if (name === "Grep" && typeof record.pattern === "string") {
      const where =
        typeof record.path === "string" ? shortenRepoPath(record.path) : undefined;
      return {
        title: "Grep",
        detail: where ? `${record.pattern} in ${where}` : record.pattern,
      };
    }
    if (name === "Glob" && typeof record.pattern === "string") {
      return { title: "Glob", detail: record.pattern };
    }
  }
  return { title: name };
}

/** Split workflow-style tool output on `---section---` markers. */
export function splitToolResultSections(content: string): ToolResultSection[] | undefined {
  if (!content.includes("---")) return undefined;
  const lines = content.split("\n");
  const sections: ToolResultSection[] = [];
  let currentLabel = "Output";
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join("\n").trim();
    if (body) sections.push({ label: currentLabel, body });
    currentLines = [];
  };

  for (const line of lines) {
    const marker = line.match(/^---\s*(.+?)\s*---\s*$/);
    if (marker) {
      flush();
      currentLabel = marker[1]!;
      continue;
    }
    currentLines.push(line);
  }
  flush();

  return sections.length > 1 ? sections : undefined;
}

export function previewToolResultText(content: string, maxLines = 6): string {
  const sections = splitToolResultSections(content);
  if (sections) {
    const head = sections[0]!;
    const lines = head.body.split("\n");
    const preview = lines.slice(0, maxLines).join("\n");
    if (lines.length > maxLines) {
      return `${preview}\n…`;
    }
    return preview;
  }
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

export function toolResultLineCount(content: string): number {
  return content.split("\n").length;
}
