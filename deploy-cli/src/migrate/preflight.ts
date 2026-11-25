/**
 * Cheap checks the migration runs against the new host: that each service's
 * resource limits fit it (staging, days before the window), and that every
 * service actually came up (after starting). Deliberately few: a migration
 * still involves some debugging.
 */

const MARK = "---saf-preflight---";

/** The deploy's compose file(s), merged, as JSON; then the host's CPUs and memory. */
export function resourcesScript(): string {
  return [
    'cd "$REMOTE_ASSETS_FOLDER_PATH"',
    'files="-f docker-compose.prod.yaml"; [ -f docker-compose.blue-green.yaml ] && files="$files -f docker-compose.blue-green.yaml"',
    "docker_cmd compose $files config --format json",
    `echo "${MARK}"`,
    "nproc",
    "awk '/MemTotal/ {print $2 * 1024}' /proc/meminfo",
  ].join("\n");
}

export interface HostResources {
  cpus: number;
  memoryBytes: number;
}

interface ComposeService {
  deploy?: {
    resources?: {
      limits?: { cpus?: number | string; memory?: number | string };
    };
  };
  restart?: string;
}

function parseResources(output: string): {
  services: Record<string, ComposeService>;
  host: HostResources;
} {
  const [json, host = ""] = output.split(MARK);
  const parsed = json!.trim()
    ? (JSON.parse(json!) as { services?: Record<string, ComposeService> })
    : {};
  const [cpus, memory] = host.trim().split("\n").map(Number);
  return {
    services: parsed.services ?? {},
    host: { cpus: cpus ?? 0, memoryBytes: memory ?? 0 },
  };
}

const MiB = 1024 * 1024;

/** Services whose limits exceed the host (Docker refuses to create those). */
export function resourceProblems(output: string): string[] {
  const { services, host } = parseResources(output);
  if (!host.cpus || !host.memoryBytes) return [];
  const problems: string[] = [];
  for (const [name, service] of Object.entries(services)) {
    const limits = service.deploy?.resources?.limits;
    const cpus = Number(limits?.cpus ?? 0);
    const memory = Number(limits?.memory ?? 0);
    if (cpus > host.cpus) {
      problems.push(
        `${name} limits CPUs to ${cpus}, but the host has ${host.cpus}`,
      );
    }
    if (memory > host.memoryBytes) {
      problems.push(
        `${name} limits memory to ${Math.round(memory / MiB)} MiB, but the host has ${Math.round(host.memoryBytes / MiB)} MiB`,
      );
    }
  }
  return problems;
}

/** Each service of the deploy's main project, and its containers' state (JSON lines). */
export function servicesStateScript(): string {
  return [
    'cd "$REMOTE_ASSETS_FOLDER_PATH"',
    "docker_cmd compose -f docker-compose.prod.yaml config --services",
    `echo "${MARK}"`,
    "docker_cmd compose -f docker-compose.prod.yaml ps --all --format json",
  ].join("\n");
}

interface ContainerState {
  Service: string;
  State: string;
  ExitCode?: number;
}

/**
 * Services that aren't running: missing, restarting, or exited with an error.
 * One-shot services that exited 0 (e.g. a migration) are fine. Blue-green
 * services live in their color's project; `up` already waits for them.
 */
export function serviceProblems(output: string): string[] {
  const [servicesText, psText = ""] = output.split(MARK);
  const services = servicesText!
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const trimmed = psText.trim();
  // Compose prints one JSON object per line (older versions: one array).
  const states: ContainerState[] = !trimmed
    ? []
    : trimmed.startsWith("[")
      ? (JSON.parse(trimmed) as ContainerState[])
      : trimmed.split("\n").map((l) => JSON.parse(l) as ContainerState);
  const problems: string[] = [];
  for (const service of services) {
    const mine = states.filter((s) => s.Service === service);
    if (mine.length === 0) {
      problems.push(`${service} has no container`);
      continue;
    }
    for (const s of mine) {
      if (s.State === "running") continue;
      if (s.State === "exited" && s.ExitCode === 0) continue;
      problems.push(
        `${service} is ${s.State}${s.ExitCode ? ` (exit ${s.ExitCode})` : ""}`,
      );
    }
  }
  return problems;
}
