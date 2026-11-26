/**
 * CVSS v3.x base score from a vector string, e.g.
 * `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` → 7.5. Debian's OSV
 * records carry vectors rather than a severity word. Null when unparseable.
 */
export function cvss3BaseScore(vector: string): number | null {
  if (!/^CVSS:3\.[01]\//.test(vector)) return null;
  const m: Record<string, string> = {};
  for (const part of vector.split("/").slice(1)) {
    const [k, v] = part.split(":");
    if (k && v) m[k] = v;
  }
  const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[m.AV ?? ""];
  const AC = { L: 0.77, H: 0.44 }[m.AC ?? ""];
  const UI = { N: 0.85, R: 0.62 }[m.UI ?? ""];
  const changed = m.S === "C";
  const PR = (changed ? { N: 0.85, L: 0.68, H: 0.5 } : { N: 0.85, L: 0.62, H: 0.27 })[m.PR ?? ""];
  const cia = (x?: string) => ({ H: 0.56, L: 0.22, N: 0 })[x ?? ""];
  const C = cia(m.C);
  const I = cia(m.I);
  const A = cia(m.A);
  if ([AV, AC, UI, PR, C, I, A].some((x) => x === undefined) || (m.S !== "U" && m.S !== "C")) return null;
  const iss = 1 - (1 - C!) * (1 - I!) * (1 - A!);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  if (impact <= 0) return 0;
  const exploitability = 8.22 * AV! * AC! * PR! * UI!;
  const raw = changed ? Math.min(1.08 * (impact + exploitability), 10) : Math.min(impact + exploitability, 10);
  // CVSS "round up" to one decimal.
  const i = Math.round(raw * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

/** CVSS qualitative rating. */
export function severityFromScore(score: number): "critical" | "high" | "moderate" | "low" | "unknown" {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "moderate";
  if (score > 0) return "low";
  return "unknown";
}
