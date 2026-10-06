import { existsSync, readFileSync } from "node:fs";
import type { BuildEvent, BuildResult, PlannedImage } from "./build-images.ts";
import type { BuildProgress } from "./executor.ts";

const OUTCOME_LABELS: Record<BuildResult["outcome"], string> = {
  "up-to-date": "✓ up to date",
  pulled: "↓ pulled",
  "in-registry": "☁ in registry",
  built: "● built",
  failed: "✗ FAILED",
  blocked: "✗ blocked",
  "would-build": "○ would build",
  "would-pull": "↓ would pull",
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const BAR_WIDTH = 20;

/**
 * `▒` steps taken from cache, `█` steps that actually ran, `░` the rest
 * (running or not started), out of the steps BuildKit has reported so far.
 */
export function progressBar(progress: BuildProgress | undefined): string {
  if (!progress || progress.total === 0) return "░".repeat(BAR_WIDTH);
  const cells = (n: number) =>
    Math.round((Math.min(n, progress.total) / progress.total) * BAR_WIDTH);
  const cached = cells(progress.cached);
  const executed = Math.min(
    BAR_WIDTH - cached,
    cells(progress.cached + progress.executed) - cached,
  );
  return (
    "▒".repeat(cached) +
    "█".repeat(executed) +
    "░".repeat(BAR_WIDTH - cached - executed)
  );
}

/**
 * An OSC 8 terminal hyperlink, as `docker build` prints its build details
 * link. Terminals only auto-link http(s)/file URLs, so a bare
 * `docker-desktop://…` isn't clickable without this.
 */
export function hyperlink(url: string, text: string = url): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/** `12 steps: 9 cached, 3 rebuilt` */
export function stepSummary(result: BuildResult): string {
  if (!result.steps) return "";
  const { total, cached, executed } = result.steps;
  return `${total} steps: ${cached} cached, ${executed} rebuilt`;
}

interface Active {
  image: string;
  action: "build" | "pull";
  started: number;
  progress?: BuildProgress;
}

export interface Reporter {
  onEvent(event: BuildEvent): void;
  /** Stops the live display; call when the run is over. */
  close(): void;
}

/**
 * Renders `saf-docker build` events. In a terminal, running builds show a
 * live progress bar each (from BuildKit's steps); otherwise (CI, pipes) each
 * build logs a line when it starts and when it finishes.
 */
export function createReporter(
  out: NodeJS.WriteStream = process.stdout,
): Reporter {
  const live = !!out.isTTY && !process.env.CI;
  const active = new Map<string, Active>();
  let liveLines = 0;
  let timer: NodeJS.Timeout | undefined;

  const width = () => Math.max(40, (out.columns ?? 100) - 1);
  const fit = (line: string) =>
    line.length > width() ? line.slice(0, width() - 1) + "…" : line;

  const clearLive = () => {
    if (liveLines > 0) out.write(`\x1b[${liveLines}A\x1b[J`);
    liveLines = 0;
  };
  const drawLive = () => {
    if (!live) return;
    const lines = [...active.values()].map((a) => {
      const elapsed = seconds(Date.now() - a.started);
      if (a.action === "pull")
        return fit(`  ↓ pulling  ${a.image}  ${elapsed}`);
      const p = a.progress;
      const counts = p
        ? `${p.cached} cached, ${p.executed} rebuilt / ${p.total}`
        : "…";
      return fit(
        `  ▶ ${a.image}  [${progressBar(p)}] ${counts}  ${elapsed}  ${p?.step ?? "starting"}`,
      );
    });
    for (const line of lines) out.write(line + "\n");
    liveLines = lines.length;
  };
  const redraw = () => {
    clearLive();
    drawLive();
  };
  /** Prints a permanent line (above the live region). */
  const print = (line = "") => {
    clearLive();
    out.write(line + "\n");
    drawLive();
  };

  const printPlan = (plan: PlannedImage[], durationMs: number) => {
    const by = (action: PlannedImage["action"]) =>
      plan.filter((p) => p.action === action);
    const toBuild = by("build");
    const upToDate = by("up-to-date");
    const inRegistry = by("in-registry");
    print(
      `Checked ${plan.length} image(s) in ${seconds(durationMs)}: ` +
        `${toBuild.length} to build, ${upToDate.length} up to date` +
        (inRegistry.length ? `, ${inRegistry.length} in registry` : ""),
    );
    for (const p of toBuild) {
      print(`  ● build      ${p.image}${p.dirty ? " (dirty)" : ""}`);
    }
    for (const p of inRegistry) print(`  ☁ registry   ${p.image}`);
    for (const p of upToDate) print(`  ✓ up to date ${p.image}`);
    print();
  };

  const printResult = (result: BuildResult) => {
    // Unchanged images were listed in the plan; pulls print when they finish.
    if (
      [
        "up-to-date",
        "in-registry",
        "pulled",
        "would-build", // dry runs are fully described by the plan
        "would-pull",
      ].includes(result.outcome)
    )
      return;
    const steps = stepSummary(result);
    print(
      `${OUTCOME_LABELS[result.outcome].padEnd(14)} ${result.image}:${result.tag}` +
        `${result.dirty ? " (dirty)" : ""}  ${seconds(result.durationMs)}` +
        (steps ? `  (${steps})` : ""),
    );
    if (result.outcome === "failed" || result.outcome === "blocked") {
      print(`    ${result.error}`);
    }
    if (result.logFile) print(`    log:    ${result.logFile}`);
    if (result.detailsUrl) {
      print(
        `    docker: ${live ? hyperlink(result.detailsUrl) : result.detailsUrl}`,
      );
    }
    if (
      result.outcome === "failed" &&
      result.logFile &&
      existsSync(result.logFile)
    ) {
      const tail = readFileSync(result.logFile, "utf8")
        .trimEnd()
        .split("\n")
        .slice(-25);
      for (const line of tail) print(`    | ${line}`);
    }
  };

  return {
    onEvent(event) {
      switch (event.type) {
        case "checked":
          printPlan(event.plan, event.durationMs);
          if (live) timer = setInterval(redraw, 500);
          break;
        case "start":
          active.set(event.ref, {
            image: event.image,
            action: event.action,
            started: Date.now(),
          });
          if (live) redraw();
          else
            print(
              `▶ ${event.action === "pull" ? "pulling" : "building"} ${event.image}`,
            );
          break;
        case "progress": {
          const entry = active.get(event.ref);
          if (entry) entry.progress = event.progress;
          break; // drawn by the timer
        }
        case "pulled":
          active.delete(event.ref);
          print(
            `${OUTCOME_LABELS.pulled.padEnd(14)} ${event.image}  ${seconds(event.durationMs)}`,
          );
          break;
        case "finish":
          active.delete(event.result.ref);
          printResult(event.result);
          break;
      }
    },
    close() {
      if (timer) clearInterval(timer);
      clearLive();
    },
  };
}
