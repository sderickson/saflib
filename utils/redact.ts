/**
 * Write-time redaction for telemetry (logs now; issues and audit projections
 * later). The rule is *identifiers, not identities*: user, request and record
 * ids pass through; names, contact details and secrets do not.
 *
 * Redaction is a safety net, not the main control. Every detection is
 * reported so the caller can raise an issue and get the leaking log call
 * fixed. URL query strings and IP addresses are cleaned without being
 * reported, since logging them is expected.
 *
 * Pure and browser-safe (no Node builtins).
 */

export type RedactionKind =
  | "secret_field"
  | "pii_field"
  | "email"
  | "phone"
  | "jwt"
  | "bearer"
  | "api_key"
  | "card"
  | "high_entropy";

export interface RedactionDetection {
  kind: RedactionKind;
  /** `message`, or `fields.<path>` (e.g. `fields.user.email`). */
  where: string;
}

export interface RedactOptions {
  /** Extra exact field names (normalized: lowercase, no `_`/`-`) treated as secrets. */
  secretKeys?: string[];
  /** Extra exact field names (normalized) treated as PII. */
  piiKeys?: string[];
}

export interface RedactResult<T> {
  value: T;
  detections: RedactionDetection[];
}

/** Placeholder for a redacted value, e.g. `[redacted:email]`. */
export const redactedMarker = (kind: RedactionKind) => `[redacted:${kind}]`;

const MAX_DEPTH = 8;

// ---------- field names ----------

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\-\s.]/g, "");
}

/** Names whose value is always a secret, matched as a suffix (`csrfToken`, `db_password`). */
const SECRET_KEY_SUFFIXES = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "privatekey",
  "authorization",
  "cookie",
  "credential",
  "credentials",
];

/** Names whose value identifies a person, matched as a suffix (`userEmail`, `firstName`). */
const PII_KEY_SUFFIXES = [
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "firstname",
  "lastname",
  "fullname",
  "displayname",
  "streetaddress",
];

/**
 * Exact names only: as suffixes these would catch identifiers like
 * `service_name` or `ip_address`.
 */
const PII_KEYS_EXACT = new Set(["name", "address", "ssn", "dob", "birthdate", "body", "query"]);

function classifyKey(key: string, options: RedactOptions): RedactionKind | undefined {
  const k = normalizeKey(key);
  if (options.secretKeys?.includes(k)) return "secret_field";
  if (options.piiKeys?.includes(k)) return "pii_field";
  if (SECRET_KEY_SUFFIXES.some((s) => k.endsWith(s))) return "secret_field";
  if (PII_KEYS_EXACT.has(k) || PII_KEY_SUFFIXES.some((s) => k.endsWith(s))) {
    return "pii_field";
  }
  return undefined;
}

// ---------- value patterns ----------

interface Pattern {
  kind: RedactionKind;
  regex: RegExp;
  /** Extra check on a match (e.g. Luhn); false keeps the text. */
  accept?: (match: string) => boolean;
}

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function shannonEntropy(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeSecret(token: string): boolean {
  if (UUID.test(token)) return false; // identifiers
  if (/^[0-9a-f]+$/i.test(token)) return false; // hashes, commit shas: identifiers
  if (!/[a-z]/.test(token) || !/[A-Z]/.test(token) || !/[0-9]/.test(token)) return false;
  return shannonEntropy(token) >= 4;
}

/** Order matters: specific shapes before the generic high-entropy catch-all. */
const PATTERNS: Pattern[] = [
  { kind: "jwt", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { kind: "bearer", regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi },
  {
    kind: "api_key",
    regex:
      /\b(?:safops_[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[bpas]-[A-Za-z0-9-]{10,})/g,
  },
  { kind: "email", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  {
    kind: "card",
    regex: /\b\d(?:[ -]?\d){12,18}\b/g,
    // Card networks start with 2-6, which also keeps epoch-millisecond
    // timestamps (13 digits starting with 1) from matching.
    accept: (m) => {
      const digits = m.replace(/[ -]/g, "");
      return digits.length >= 13 && digits.length <= 19 && /^[2-6]/.test(digits) && luhn(digits);
    },
  },
  {
    kind: "phone",
    // +E.164-ish, or North American (555) 555-5555 / 555-555-5555 / 555.555.5555.
    regex: /(?:\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.-]{6,}\d)|(?:\(\d{3}\)\s?\d{3}-\d{4})|(?:\b\d{3}[-.]\d{3}[-.]\d{4}\b)/g,
  },
  {
    kind: "high_entropy",
    regex: /[A-Za-z0-9+/_=-]{32,}/g,
    accept: looksLikeSecret,
  },
];

// ---------- expected noise: query strings and IPs ----------

/** `https://x/y?a=1#f` → `https://x/y?[stripped]`; also bare paths `/y?a=1`. */
const URL_WITH_QUERY =
  /((?:https?:\/\/[^\s?#"'<>]+)|(?:(?<=^|[\s"'=(,])\/[^\s?#"'<>]*))[?#][^\s"'<>]*/g;

function stripQueryStrings(s: string): string {
  return s.replace(URL_WITH_QUERY, "$1?[stripped]");
}

const IPV4 = /\b(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6_CANDIDATE = /(?<![0-9A-Fa-f:])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![0-9A-Fa-f:])/g;

function isIPv6(s: string): boolean {
  const doubleColons = s.split("::").length - 1;
  if (doubleColons > 1) return false;
  const groups = s.split(":");
  if (doubleColons === 0 && groups.length !== 8) return false;
  if (doubleColons === 1 && groups.length > 8) return false;
  return groups.every((g) => g === "" || /^[0-9A-Fa-f]{1,4}$/.test(g)) && /[0-9A-Fa-f]/.test(s);
}

function expandIPv6(s: string): string[] {
  const [head = "", tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = tail !== undefined ? Array(8 - h.length - t.length).fill("0") : [];
  return [...h, ...fill, ...t];
}

/** Keep the network, drop the host: IPv4 to /24, IPv6 to /48. */
function truncateIps(s: string): string {
  let out = s.replace(IPV4, (_m, a, b, c) => `${a}.${b}.${c}.0`);
  out = out.replace(IPV6_CANDIDATE, (m) => {
    // Needs a `::` or all 8 groups, which rules out times like 12:30:45.
    if (!isIPv6(m) || (!m.includes("::") && m.split(":").length !== 8)) return m;
    const g = expandIPv6(m);
    return `${g.slice(0, 3).join(":")}::`;
  });
  return out;
}

// ---------- strings and structures ----------

/** Redact one string: clean URLs and IPs, then mask and report pattern matches. */
export function redactString(
  input: string,
  where = "message",
): RedactResult<string> {
  const detections: RedactionDetection[] = [];
  let s = truncateIps(stripQueryStrings(input));
  for (const { kind, regex, accept } of PATTERNS) {
    s = s.replace(regex, (match) => {
      if (accept && !accept(match)) return match;
      detections.push({ kind, where });
      return redactedMarker(kind);
    });
  }
  return { value: s, detections };
}

function redactValue(
  value: unknown,
  path: string,
  depth: number,
  options: RedactOptions,
  detections: RedactionDetection[],
  seen: WeakSet<object>,
): unknown {
  if (typeof value === "string") {
    const r = redactString(value, path);
    detections.push(...r.detections);
    return r.value;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[MaxDepth]";
  seen.add(value);

  if (value instanceof Error) {
    return redactValue(
      { name: value.name, message: value.message, stack: value.stack },
      path,
      depth,
      options,
      detections,
      seen,
    );
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((v, i) => redactValue(v, `${path}[${i}]`, depth + 1, options, detections, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const keyKind = classifyKey(key, options);
    if (keyKind && v !== null && v !== undefined && v !== "") {
      detections.push({ kind: keyKind, where: childPath });
      out[key] = redactedMarker(keyKind);
      continue;
    }
    out[key] = redactValue(v, childPath, depth + 1, options, detections, seen);
  }
  return out;
}

/**
 * Redact a log entry's message and structured fields. Field names that denote
 * secrets or PII are masked whole; string values anywhere are scanned for
 * secret and PII patterns. Errors become `{ name, message, stack }`; dates
 * become ISO strings; cycles and excessive depth are cut off.
 */
export function redactLogEntry(
  entry: { message: string; fields?: Record<string, unknown> },
  options: RedactOptions = {},
): RedactResult<{ message: string; fields?: Record<string, unknown> }> {
  const message = redactString(entry.message, "message");
  const detections = [...message.detections];
  const fields =
    entry.fields === undefined
      ? undefined
      : (redactValue(entry.fields, "fields", 0, options, detections, new WeakSet()) as Record<
          string,
          unknown
        >);
  return { value: { message: message.value, fields }, detections };
}
