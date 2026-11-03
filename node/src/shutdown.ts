/**
 * Graceful shutdown for a service process. Subsystems (HTTP servers, the jobs
 * runtime, cron) register a stop step with {@link onShutdown}; on SIGTERM or
 * SIGINT they all run together, then the process exits. A blue-green deploy
 * stops the old color with SIGTERM, so in-flight requests and jobs finish
 * instead of being cut off.
 *
 * Steps get SAF_SHUTDOWN_TIMEOUT_MS (default 25s, under compose's
 * stop_grace_period) before the process exits anyway.
 */

interface ShutdownStep {
  name: string;
  run: () => void | Promise<void>;
}

const steps: ShutdownStep[] = [];
let installed = false;
let started: Promise<void> | undefined;

const DEFAULT_TIMEOUT_MS = 25_000;

/** Registers a step to run when the process is asked to stop. */
export function onShutdown(
  name: string,
  run: () => void | Promise<void>,
): void {
  steps.push({ name, run });
  if (installed) return;
  installed = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

export interface ShutdownOptions {
  /** Defaults to SAF_SHUTDOWN_TIMEOUT_MS, else 25s. */
  timeoutMs?: number;
  /** Exit the process afterwards (default true). */
  exit?: boolean;
}

/**
 * Runs every registered step (once, however often it's called), waiting up to
 * the timeout, then exits unless `exit: false`.
 */
export function shutdown(
  reason: string = "shutdown",
  options: ShutdownOptions = {},
): Promise<void> {
  started ??= (async () => {
    const timeoutMs =
      options.timeoutMs ??
      (Number(process.env.SAF_SHUTDOWN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
    console.log(
      `${reason}: stopping ${steps.map((s) => s.name).join(", ") || "(nothing registered)"}`,
    );
    const all = Promise.all(
      steps.map(async (step) => {
        try {
          await step.run();
        } catch (error) {
          console.error(`Shutdown step "${step.name}" failed:`, error);
        }
      }),
    ).then(() => "done" as const);
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
      timer.unref();
    });
    const outcome = await Promise.race([all, timeout]);
    clearTimeout(timer);
    if (outcome === "timeout") {
      console.error(`Shutdown didn't finish within ${timeoutMs}ms; exiting.`);
    } else {
      console.log("Shutdown complete.");
    }
    if (options.exit !== false) process.exit(0);
  })();
  return started;
}

/** @internal test helper. */
export function _resetShutdownForTests(): void {
  steps.length = 0;
  started = undefined;
}
