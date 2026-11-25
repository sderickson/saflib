import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

/** How the walkthrough talks to the operator. Swapped for a script in tests. */
export interface MigrateIO {
  print(text?: string): void;
  /** Enter → `go`, `s` → `skip`, `q` → `quit`. */
  choose(prompt: string): Promise<"go" | "skip" | "quit">;
  /** Free-text answer; empty input takes `fallback` (shown in brackets). */
  ask(question: string, fallback?: string): Promise<string>;
  close(): void;
}

export function terminalIO(): MigrateIO {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    print: (text = "") => console.log(text),
    choose: async (prompt) => {
      for (;;) {
        const answer = (
          await rl.question(`${prompt} [Enter] continue · s skip · q quit: `)
        )
          .trim()
          .toLowerCase();
        if (answer === "") return "go";
        if (answer === "s") return "skip";
        if (answer === "q") return "quit";
      }
    },
    ask: async (question, fallback) => {
      const answer = (
        await rl.question(`${question}${fallback ? ` [${fallback}]` : ""}: `)
      ).trim();
      return answer || fallback || "";
    },
    close: () => rl.close(),
  };
}

export interface MigrateState {
  version: 1;
  to: string;
  completed: string[];
  skipped: string[];
  /** The new host as first reached (`user@temporary-address`). */
  newHost?: string;
  newMachineId?: string;
  /** The new host's public keys (`<type> <key>`), to recognize it later. */
  newHostKeys?: string[];
  userNamespaces?: boolean;
  /** The data was copied once during staging; the window's copy sends only changes. */
  precopied?: boolean;
}

export function statePath(rootDir: string, to: string): string {
  return path.join(rootDir, ".saf-deploy", `migrate-${to}.json`);
}

export function loadState(file: string, to: string): MigrateState {
  if (existsSync(file)) {
    const state = JSON.parse(readFileSync(file, "utf8")) as MigrateState;
    if (state.to === to) return state;
  }
  return { version: 1, to, completed: [], skipped: [] };
}

export function saveState(file: string, state: MigrateState): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

export type StepKind = "manual" | "auto" | "confirm" | "info";

export interface Step<C> {
  id: string;
  title: string;
  kind: StepKind;
  /** What the step is about, printed before the prompt. */
  describe(ctx: C): string[];
  /** Does the step; throws to report a failure (the operator can retry). */
  run?(ctx: C): Promise<void>;
  /** Printed with the step: how to undo the migration from here. */
  rollback?(ctx: C): string[];
}

const PROMPTS: Record<StepKind, string> = {
  manual: "When that's done:",
  auto: "Run it?",
  confirm: "Ready?",
  info: "Noted?",
};

/**
 * Walks the operator through `steps` in order, skipping those already in
 * `state.completed`, saving after each one. Resolves `"done"` when every step
 * is complete, `"quit"` if the operator stopped (rerunning resumes there).
 */
export async function runSteps<C>(
  steps: Step<C>[],
  ctx: C,
  state: MigrateState,
  io: MigrateIO,
  save: () => void,
): Promise<"done" | "quit"> {
  const total = steps.length;
  for (const [index, step] of steps.entries()) {
    if (state.completed.includes(step.id)) continue;
    io.print();
    io.print(`── Step ${index + 1}/${total}: ${step.title} ──`);
    for (const line of step.describe(ctx)) io.print(line);
    const rollback = step.rollback?.(ctx);
    if (rollback?.length) {
      io.print();
      for (const line of rollback) io.print(line);
    }
    io.print();
    let prompt = PROMPTS[step.kind];
    for (;;) {
      const choice = await io.choose(prompt);
      if (choice === "quit") {
        save();
        io.print(
          `Stopped before step ${index + 1}. Rerun the same command to resume here.`,
        );
        return "quit";
      }
      if (choice === "skip") {
        state.skipped.push(step.id);
        break;
      }
      try {
        await step.run?.(ctx);
        break;
      } catch (error) {
        io.print();
        io.print(`✗ ${error instanceof Error ? error.message : String(error)}`);
        prompt = "Fix that, then retry?";
      }
    }
    state.completed.push(step.id);
    save();
    io.print(`✓ ${step.title}`);
  }
  return "done";
}
