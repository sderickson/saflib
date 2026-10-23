import path from "node:path";
import { toWorkspacePath } from "./workspace.ts";

/**
 * Builds the commit message for one step's changes. The commit history of
 * a plan is meant to read as a navigable log of the run:
 *
 *     results-payments 2.7.2 openapi/route(push-to-stripe) update: route
 *
 *     File: daemon/service/spec/routes/matter-finalizations/push-to-stripe.yaml
 *     Step 2 of 5 in openapi/route (push-to-stripe), called from step 7
 *     of phase-2-stripe-invoice-items.workflow.yaml.
 *     Agent: claude-agent, resumed session 3f2a9c1d, 4 turns, 38s, $0.06
 *
 *     Workflow-Plan: daemon/plans/notes/2026-10-14-results-payments
 *     Workflow-Run: Bd0roKh92yfr
 *     Workflow-Step: 2.7.2
 *     Workflow-Source-Run: 9x2KqL0p
 *
 * The address (`2.7.2`: phase 2, step 7, nested step 2) uses the same
 * 1-based step numbers the dev site shows (`step_index + 1`). Trailers
 * make history searchable with git alone, e.g.
 * `git log --grep 'Workflow-Run: Bd0roKh92yfr'`.
 */

/** The parts of a `workflow_run` row the message needs. */
export interface CommitRunInfo {
  id: string;
  workflow_ref: string;
  input: Record<string, unknown>;
  /** Index of the step in the parent that called this run; null for the root. */
  parent_step_index: number | null;
  /** Used to show file paths relative to the root run's directory. */
  cwd?: string;
}

export interface CommitMessageInput {
  /** Root first, ending with the run whose step is committing (see `loadRunChain`). */
  chain: CommitRunInfo[];
  /** 0-based index of the committing step within the last run in `chain`. */
  stepIndex: number;
  /** Number of steps in the committing run's workflow. */
  stepCount: number;
  kind: string;
  stepInput: unknown;
  stepResult?: Record<string, unknown>;
  /** The step's generic label (`summarizeStepInput(...) ?? kind`). */
  label: string;
  skipped: boolean;
  /** One line summarizing this step's agent turns, if any. */
  agentSummary?: string;
}

const SUBJECT_MAX = 72;
const BODY_WIDTH = 72;
const PROMPT_PARAGRAPH_MAX = 600;

/** `<plan dir>/<date>-<name>/phase-<n>-….workflow.yaml` */
const PLAN_FILE_PATTERN = /^(.*?\d{4}-\d{2}-\d{2}-([^/]+))\/(phase-(\d+)[^/]*\.(?:ya?ml|json))$/;

export interface PlanFileInfo {
  /** Folder holding the plan's files, e.g. `daemon/plans/notes/2026-10-14-results-payments`. */
  planDir: string;
  /** The folder name without its date, e.g. `results-payments`. */
  planName: string;
  phase: number;
  fileName: string;
}

export function parsePlanFile(workflowRef: string): PlanFileInfo | undefined {
  const match = PLAN_FILE_PATTERN.exec(workflowRef);
  if (!match) return undefined;
  return {
    planDir: match[1],
    planName: match[2],
    fileName: match[3],
    phase: Number(match[4]),
  };
}

/** What a nested run is building, from its input: `name`, else `path`'s basename. */
export function describeRunSubject(input: Record<string, unknown>): string | undefined {
  if (typeof input.name === "string" && input.name.trim()) return input.name.trim();
  if (typeof input.path === "string" && input.path.trim()) {
    const base = path.basename(input.path.trim());
    const dot = base.indexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
  }
  return undefined;
}

/** First non-empty line, minus markdown emphasis/heading markers. */
export function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return stripMarkdown(line);
}

/** First paragraph (up to a blank line), unwrapped onto one line. */
export function firstParagraph(text: string): string {
  const paragraph = text.trim().split(/\n\s*\n/)[0] ?? "";
  return stripMarkdown(paragraph.replace(/\s*\n\s*/g, " "));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^\s*#+\s*/, "")
    .replace(/\*\*|__|`/g, "")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function wrap(text: string, width = BODY_WIDTH): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

function runLabel(run: CommitRunInfo): string {
  const subject = describeRunSubject(run.input);
  return subject ? `${run.workflow_ref}(${subject})` : run.workflow_ref;
}

function stepPrompt(kind: string, stepInput: unknown): string | undefined {
  if (!stepInput || typeof stepInput !== "object") return undefined;
  const prompt = (stepInput as { prompt?: unknown }).prompt;
  if ((kind === "prompt" || kind === "update") && typeof prompt === "string" && prompt.trim()) {
    return prompt;
  }
  return undefined;
}

/** What the step did, more specific than the generic label where possible. */
function stepAction(input: CommitMessageInput): string {
  const prompt = input.kind === "prompt" ? stepPrompt(input.kind, input.stepInput) : undefined;
  return prompt ? firstLine(prompt) : input.label;
}

/** The file an `update` step edited, relative to the root run's directory when inside it. */
function updatedFile(input: CommitMessageInput): string | undefined {
  const filePath = input.stepResult?.filePath;
  if (input.kind !== "update" || typeof filePath !== "string") return undefined;
  // Root run rows keep checkout paths; step results from a workspace run hold clone paths.
  const base = toWorkspacePath(input.chain[0].cwd);
  if (!base) return filePath;
  const relative = path.relative(base, toWorkspacePath(filePath));
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : filePath;
}

/** e.g. `[2, 7, 2]`: phase (if the root is a plan file), then 1-based step numbers down the chain. */
function stepAddress(input: CommitMessageInput, plan: PlanFileInfo | undefined): number[] {
  const steps = input.chain.slice(1).map((run) => (run.parent_step_index ?? 0) + 1);
  steps.push(input.stepIndex + 1);
  return plan ? [plan.phase, ...steps] : steps;
}

export function buildCommitMessage(input: CommitMessageInput): string {
  const root = input.chain[0];
  const current = input.chain[input.chain.length - 1];
  const nested = input.chain.length > 1;
  const plan = parsePlanFile(root.workflow_ref);
  const address = stepAddress(input, plan).join(".");

  // --- Subject ---
  const prefix = [
    plan ? plan.planName : runLabel(root),
    address,
    nested ? runLabel(current) : undefined,
    input.skipped ? "skip" : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const subject = `${prefix} ${truncate(stepAction(input), Math.max(20, SUBJECT_MAX - prefix.length - 1))}`;

  // --- Body ---
  const paragraphs: string[] = [];

  const prompt = stepPrompt(input.kind, input.stepInput);
  if (prompt) {
    paragraphs.push(wrap(truncate(firstParagraph(prompt), PROMPT_PARAGRAPH_MAX)));
  } else if (input.label.length > SUBJECT_MAX - prefix.length - 1) {
    // e.g. a long command line the subject had to cut short.
    paragraphs.push(wrap(input.label));
  }

  const where: string[] = [];
  const subjectOf = (run: CommitRunInfo) => {
    const s = describeRunSubject(run.input);
    return s ? ` (${s})` : "";
  };
  const fileOf = (run: CommitRunInfo) => parsePlanFile(run.workflow_ref)?.fileName ?? run.workflow_ref;
  where.push(
    `${input.skipped ? "Skipped step" : "Step"} ${input.stepIndex + 1} of ${input.stepCount} in ${nested ? `${current.workflow_ref}${subjectOf(current)}` : fileOf(current)}`,
  );
  for (let i = input.chain.length - 1; i > 0; i--) {
    const caller = input.chain[i - 1];
    const callerLabel = i - 1 === 0 ? fileOf(caller) : `${caller.workflow_ref}${subjectOf(caller)}`;
    where.push(`called from step ${(input.chain[i].parent_step_index ?? 0) + 1} of ${callerLabel}`);
  }
  const file = updatedFile(input);
  const locationLines = [
    ...(file ? [`File: ${file}`] : []),
    wrap(`${where.join(", ")}.`),
  ];
  if (input.agentSummary) locationLines.push(input.agentSummary);
  paragraphs.push(locationLines.join("\n"));

  // --- Trailers (must be the final paragraph) ---
  const trailers: string[] = [];
  if (plan) trailers.push(`Workflow-Plan: ${plan.planDir}`);
  trailers.push(`Workflow-Run: ${root.id}`);
  trailers.push(`Workflow-Step: ${address}`);
  if (nested) {
    trailers.push(`Workflow-Source-Run: ${current.id}`);
    trailers.push(`Workflow-Source: ${current.workflow_ref}`);
  }
  paragraphs.push(trailers.join("\n"));

  return [subject, ...paragraphs].join("\n\n");
}

/** One-line summary of a step's agent turns for the commit body. */
export function summarizeAgentTurns(
  turns: {
    cli: string;
    session_id: string | null;
    resumed_session_id: string | null;
    started_at: Date;
    finished_at: Date;
    num_turns: number | null;
    cost_usd: number | null;
  }[],
): string | undefined {
  if (turns.length === 0) return undefined;
  const first = turns[0];
  const session = first.session_id ?? turns.find((t) => t.session_id)?.session_id;
  const parts: string[] = [first.cli];
  if (session) {
    parts.push(`${first.resumed_session_id ? "resumed" : "new"} session ${session.slice(0, 8)}`);
  }
  if (turns.length > 1) parts.push(`${turns.length} invocations`);
  const numTurns = turns.reduce((sum, t) => sum + (t.num_turns ?? 0), 0);
  if (numTurns) parts.push(`${numTurns} turns`);
  const ms = turns.reduce((sum, t) => sum + (t.finished_at.getTime() - t.started_at.getTime()), 0);
  parts.push(`${Math.round(ms / 1000)}s`);
  if (turns.some((t) => t.cost_usd !== null)) {
    parts.push(`$${turns.reduce((sum, t) => sum + (t.cost_usd ?? 0), 0).toFixed(2)}`);
  }
  return `Agent: ${parts.join(", ")}`;
}
