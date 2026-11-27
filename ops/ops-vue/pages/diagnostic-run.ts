import { computed, reactive, ref } from "vue";
import type { OpsDiagnosticProbe } from "@saflib/ops-spec";
import { getOpsDiagnosticRun, runOpsDiagnosticProbe } from "../requests/queries.ts";

export type ProbeStatus = "idle" | "sending" | "waiting" | "landed" | "missing" | "skipped" | "error";
export interface ProbeState {
  status: ProbeStatus;
  /** ms from firing to landing. */
  landedMs?: number;
  ref?: { kind: string; id: string } | null;
  error?: string;
}

const POLL_MS = 1500;
const TIMEOUT_MS = 45_000;

/** A short random run id (the tag's `<runId>`). */
export const newRunId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

/** Fires client probes in the browser; `throwVue` mounts the component that throws. */
export interface ClientActions {
  throwVue: (message: string) => void;
}

export function fireClientProbe(id: string, runId: string, actions: ClientActions) {
  const tag = `[diag:${runId}] ${id}`;
  if (id === "client-vue") actions.throwVue(`${tag}: thrown on purpose`);
  else if (id === "client-promise") void Promise.reject(new Error(`${tag}: rejected on purpose`));
  else if (id === "client-csp") {
    // Blocked by img-src before any network request; the browser's report
    // names this host, which carries the run id.
    const img = new Image();
    img.src = `https://diag-${runId}.invalid/pixel.png`;
  }
}

/**
 * One self-test run: fire probes (client ones here, server ones through the
 * API), then poll until each signal lands or times out.
 */
export function useDiagnosticRun(actions: ClientActions) {
  const runId = ref<string | null>(null);
  const startedAt = ref<Date | null>(null);
  const states = reactive<Record<string, ProbeState>>({});
  const firedAt: Record<string, number> = {};
  let timer: ReturnType<typeof setTimeout> | undefined;

  function ensureRun() {
    if (!runId.value) {
      runId.value = newRunId();
      startedAt.value = new Date();
    }
    return runId.value;
  }

  async function fire(probe: OpsDiagnosticProbe) {
    if (probe.skip_reason) {
      states[probe.id] = { status: "skipped" };
      return;
    }
    const id = ensureRun();
    states[probe.id] = { status: "sending" };
    firedAt[probe.id] = Date.now();
    try {
      if (probe.side === "client") fireClientProbe(probe.id, id, actions);
      else await runOpsDiagnosticProbe(id, probe.id);
      states[probe.id] = { status: "waiting" };
      schedulePoll();
    } catch (e) {
      states[probe.id] = { status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function runAll(probes: OpsDiagnosticProbe[]) {
    runId.value = null;
    for (const key of Object.keys(states)) delete states[key];
    await Promise.all(probes.map(fire));
  }

  function schedulePoll() {
    clearTimeout(timer);
    timer = setTimeout(poll, POLL_MS);
  }

  async function poll() {
    if (!runId.value || !startedAt.value) return;
    const waiting = Object.entries(states).filter(([, s]) => s.status === "waiting");
    if (waiting.length === 0) return;
    try {
      const { results } = await getOpsDiagnosticRun(runId.value, new Date(startedAt.value.getTime() - 1000).toISOString());
      for (const r of results) {
        const s = states[r.probe_id];
        if (s?.status !== "waiting") continue;
        if (r.landed_at) {
          states[r.probe_id] = {
            status: "landed",
            landedMs: Math.max(0, new Date(r.landed_at).getTime() - (firedAt[r.probe_id] ?? Date.now())),
            ref: r.ref,
          };
        } else if (Date.now() - (firedAt[r.probe_id] ?? 0) > TIMEOUT_MS) {
          states[r.probe_id] = { status: "missing" };
        }
      }
    } catch {
      // Try again next tick.
    }
    if (Object.values(states).some((s) => s.status === "waiting")) schedulePoll();
  }

  const counts = computed(() => {
    const c = { landed: 0, skipped: 0, missing: 0, waiting: 0 };
    for (const s of Object.values(states)) {
      if (s.status === "landed") c.landed++;
      else if (s.status === "skipped") c.skipped++;
      else if (s.status === "missing" || s.status === "error") c.missing++;
      else if (s.status === "waiting" || s.status === "sending") c.waiting++;
    }
    return c;
  });

  return { runId, startedAt, states, counts, fire, runAll, stop: () => clearTimeout(timer) };
}
