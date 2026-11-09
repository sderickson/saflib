/**
 * A small line-chart renderer for Prometheus `query_range` results. Pure: no
 * DOM, no fonts needed for SVG (PNG conversion bundles one; see render-png).
 */

export interface GraphSeries {
  metric: Record<string, string>;
  /** [unix_seconds, "value"] pairs, as Prometheus returns them. */
  values: [number, string][];
}

export interface RenderGraphOptions {
  series: GraphSeries[];
  /** Unix seconds. */
  start: number;
  end: number;
  width: number;
  height: number;
  title?: string;
}

export const FONT_FAMILY = "DejaVu Sans";
const MAX_LINES = 10;
/** Legend entries shown; more lines are summarized as "+N more" so the plot keeps its height. */
const MAX_LEGEND = 3;
const PALETTE = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#475569",
];
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Legend label for one series, given the label keys every series shares. */
export function seriesLabel(metric: Record<string, string>, constantKeys: Set<string> = new Set()): string {
  const parts = Object.entries(metric)
    .filter(([k]) => k !== "__name__" && !constantKeys.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? parts.join(", ") : (metric.__name__ ?? "value");
}

/**
 * Label keys with the same value on every series (e.g. saf_app, often job):
 * they don't tell lines apart, so the legend leaves them out. With a single
 * series, the scrape's identity labels are dropped instead.
 */
export function constantLabelKeys(metrics: Record<string, string>[]): Set<string> {
  if (metrics.length <= 1) return new Set(["saf_app", "instance", "job", "service_name"]);
  const keys = new Set(metrics.flatMap((m) => Object.keys(m)));
  return new Set([...keys].filter((k) => metrics.every((m) => m[k] === metrics[0]![k])));
}

/** About `count` round tick values covering [min, max] (1, 2, 5 × 10^n steps). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) {
    const pad = Math.abs(min) || 1;
    return niceTicks(min - pad, max + pad, count);
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  if (ticks[ticks.length - 1]! < max) ticks.push(Number((ticks[ticks.length - 1]! + step).toPrecision(12)));
  return ticks;
}

export function formatValue(v: number): string {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e9) return `${+(v / 1e9).toPrecision(3)}G`;
  if (a >= 1e6) return `${+(v / 1e6).toPrecision(3)}M`;
  if (a >= 1e3) return `${+(v / 1e3).toPrecision(3)}k`;
  if (a >= 1) return `${+v.toPrecision(3)}`;
  if (a >= 1e-3) return `${+(v * 1e3).toPrecision(3)}m`;
  return v.toExponential(1);
}

const TIME_STEPS = [60, 300, 900, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600, 86400, 2 * 86400, 7 * 86400];

function timeTicks(start: number, end: number, count = 6): { ticks: number[]; step: number } {
  const step = TIME_STEPS.find((s) => (end - start) / s <= count) ?? TIME_STEPS[TIME_STEPS.length - 1]!;
  const ticks: number[] = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t);
  return { ticks, step };
}

function formatTime(t: number, step: number): string {
  const iso = new Date(t * 1000).toISOString(); // UTC
  const hm = iso.slice(11, 16);
  const md = iso.slice(5, 10);
  if (step >= 86400) return md;
  return hm === "00:00" ? md : hm;
}

export function renderGraphSvg(o: RenderGraphOptions): string {
  const { width: W, height: H } = o;
  const shown = o.series.slice(0, MAX_LINES);
  const labelled = shown.slice(0, MAX_LEGEND);
  const unlabelledCount = o.series.length - labelled.length;
  const legendRows = labelled.length + (unlabelledCount > 0 ? 1 : 0);
  const m = { top: o.title ? 30 : 12, right: 16, bottom: 30 + legendRows * 15 + (legendRows ? 6 : 0), left: 56 };
  const pw = Math.max(10, W - m.left - m.right);
  const ph = Math.max(10, H - m.top - m.bottom);

  const points = shown.map((s) =>
    s.values
      .map(([t, v]) => [t, Number(v)] as const)
      .filter(([, v]) => Number.isFinite(v)),
  );
  const all = points.flat().map(([, v]) => v);
  const yTicks = all.length > 0 ? niceTicks(Math.min(0, ...all), Math.max(...all)) : [0, 1];
  const yMin = yTicks[0]!;
  const yMax = yTicks[yTicks.length - 1]!;
  const x = (t: number) => m.left + ((t - o.start) / Math.max(1, o.end - o.start)) * pw;
  const y = (v: number) => m.top + ph - ((v - yMin) / Math.max(1e-12, yMax - yMin)) * ph;

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT_FAMILY}, sans-serif" font-size="11">`,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
  );
  if (o.title) {
    out.push(`<text x="${m.left}" y="19" font-size="13" font-weight="bold" fill="#111827">${escapeXml(truncate(o.title, 90))}</text>`);
  }
  for (const v of yTicks) {
    const yy = y(v).toFixed(1);
    out.push(
      `<line x1="${m.left}" x2="${m.left + pw}" y1="${yy}" y2="${yy}" stroke="#e5e7eb"/>`,
      `<text x="${m.left - 6}" y="${yy}" text-anchor="end" dominant-baseline="middle" fill="#6b7280">${escapeXml(formatValue(v))}</text>`,
    );
  }
  const { ticks, step } = timeTicks(o.start, o.end);
  for (const t of ticks) {
    const xx = x(t).toFixed(1);
    out.push(
      `<line x1="${xx}" x2="${xx}" y1="${m.top + ph}" y2="${m.top + ph + 4}" stroke="#9ca3af"/>`,
      `<text x="${xx}" y="${m.top + ph + 16}" text-anchor="middle" fill="#6b7280">${escapeXml(formatTime(t, step))}</text>`,
    );
  }
  out.push(
    `<text x="${m.left + pw}" y="${m.top + ph + 28}" text-anchor="end" font-size="9" fill="#9ca3af">UTC</text>`,
    `<line x1="${m.left}" x2="${m.left + pw}" y1="${m.top + ph}" y2="${m.top + ph}" stroke="#9ca3af"/>`,
  );

  if (all.length === 0) {
    out.push(`<text x="${m.left + pw / 2}" y="${m.top + ph / 2}" text-anchor="middle" fill="#9ca3af">No data</text>`);
  }
  points.forEach((pts, i) => {
    // Break the line where a sample is missing (gap over 1.5x the median spacing).
    const gaps = pts.slice(1).map(([t], j) => t - pts[j]![0]).sort((a, b) => a - b);
    const typical = gaps.length ? gaps[Math.floor(gaps.length / 2)]! : Infinity;
    let d = "";
    pts.forEach(([t, v], j) => {
      const jump = j === 0 || t - pts[j - 1]![0] > typical * 1.5;
      d += `${jump ? "M" : "L"}${x(t).toFixed(1)},${y(v).toFixed(1)}`;
    });
    if (d) out.push(`<path d="${d}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="1.6"/>`);
  });

  const constant = constantLabelKeys(shown.map((s) => s.metric));
  let ly = m.top + ph + 44;
  labelled.forEach((s, i) => {
    out.push(
      `<rect x="${m.left}" y="${ly - 8}" width="10" height="10" fill="${PALETTE[i % PALETTE.length]}"/>`,
      `<text x="${m.left + 16}" y="${ly}" fill="#374151">${escapeXml(truncate(seriesLabel(s.metric, constant), Math.floor(pw / 6)))}</text>`,
    );
    ly += 15;
  });
  if (unlabelledCount > 0) {
    out.push(
      `<text x="${m.left}" y="${ly}" fill="#6b7280">+${unlabelledCount} more series${o.series.length > MAX_LINES ? ` (${o.series.length - MAX_LINES} not drawn)` : ""}</text>`,
    );
  }
  out.push("</svg>");
  return out.join("\n");
}
