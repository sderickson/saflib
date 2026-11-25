import {
  fetchAllKratosPages,
  fetchKratosIdentityById,
  kratosAdminBaseUrl,
} from "@saflib/express";
import type { IdentityRecord, IdentitySummary } from "@saflib/ory-kratos-spec";

/** What the product knows about a person that Kratos doesn't. */
export interface IdentityProfile {
  name?: string | null;
  org?: string | null;
  role?: string | null;
}

/**
 * Profiles for identity ids. Kratos traits only hold the email, so the
 * product supplies names (and org/role, if it has them).
 */
export type ResolveProfiles = (
  ids: string[],
) => Promise<Record<string, IdentityProfile | undefined>>;

/** Credential types that count as a second factor. */
export const MFA_CREDENTIAL_TYPES = ["totp", "webauthn", "passkey"] as const;

interface KratosIdentityLike {
  id?: unknown;
  state?: unknown;
  created_at?: unknown;
  traits?: { email?: unknown };
  verifiable_addresses?: { verified?: unknown }[];
  credentials?: Record<string, { identifiers?: unknown[] } | undefined>;
}

/** Second factors an identity has set up. */
export function mfaMethods(raw: unknown): string[] {
  const creds = (raw as KratosIdentityLike)?.credentials ?? {};
  return MFA_CREDENTIAL_TYPES.filter(
    (type) => (creds[type]?.identifiers?.length ?? 0) > 0,
  );
}

/** Maps a Kratos admin identity to what admin pages show. */
export function toIdentitySummary(
  raw: unknown,
  profile: IdentityProfile = {},
): IdentitySummary | null {
  const identity = raw as KratosIdentityLike;
  if (!identity || typeof identity.id !== "string") return null;
  const email = identity.traits?.email;
  return {
    id: identity.id,
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    name: profile.name ?? null,
    org: profile.org ?? null,
    role: profile.role ?? null,
    verified: (identity.verifiable_addresses ?? []).some((a) => a.verified === true),
    state: typeof identity.state === "string" ? identity.state : "active",
    created_at:
      typeof identity.created_at === "string"
        ? identity.created_at
        : new Date(0).toISOString(),
  };
}

const PAGE = 500;
const credentialParams = MFA_CREDENTIAL_TYPES.map((t) => `include_credential=${t}`).join("&");

/** Latest `authenticated_at` per identity, from Kratos sessions. */
async function lastSignIns(): Promise<Map<string, string>> {
  const result = await fetchAllKratosPages(`/admin/sessions?page_size=${PAGE}&expand=identity`);
  const latest = new Map<string, string>();
  if (!result.ok) return latest;
  for (const raw of result.items) {
    const s = raw as { authenticated_at?: unknown; identity?: { id?: unknown } };
    const id = s.identity?.id;
    const at = s.authenticated_at;
    if (typeof id !== "string" || typeof at !== "string") continue;
    const prev = latest.get(id);
    if (!prev || at > prev) latest.set(id, at);
  }
  return latest;
}

export interface IdentityDirectory {
  /** Every identity, newest first. Cached briefly. */
  all(): Promise<IdentityRecord[]>;
  /** One identity with its second factors and active session count. */
  get(id: string): Promise<
    | { ok: true; identity: IdentityRecord; mfa_methods: string[]; active_sessions: number }
    | { ok: false; status: number }
  >;
}

/**
 * An in-memory view of all identities, refreshed at most every `ttlMs`.
 * Kratos has no name search, so the Users page filters this list; fine for
 * a few thousand identities.
 */
export function createIdentityDirectory(
  resolveProfiles: ResolveProfiles | undefined,
  ttlMs = 30_000,
): IdentityDirectory {
  let cache: { at: number; records: Promise<IdentityRecord[]> } | null = null;

  async function load(): Promise<IdentityRecord[]> {
    const [identities, signIns] = await Promise.all([
      fetchAllKratosPages(`/admin/identities?page_size=${PAGE}&${credentialParams}`),
      lastSignIns(),
    ]);
    if (!identities.ok) {
      throw Object.assign(new Error("Identity service error"), { status: 502 });
    }
    const ids = identities.items
      .map((raw) => (raw as KratosIdentityLike).id)
      .filter((id): id is string => typeof id === "string");
    const profiles = resolveProfiles && ids.length > 0 ? await resolveProfiles(ids) : {};
    const records: IdentityRecord[] = [];
    for (const raw of identities.items) {
      const id = (raw as KratosIdentityLike).id as string;
      const summary = toIdentitySummary(raw, profiles[id]);
      if (!summary) continue;
      records.push({
        ...summary,
        mfa: mfaMethods(raw).length > 0,
        last_sign_in_at: signIns.get(summary.id) ?? null,
      });
    }
    records.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return records;
  }

  return {
    all() {
      if (!cache || Date.now() - cache.at > ttlMs) {
        const records = load();
        cache = { at: Date.now(), records };
        // A failed load shouldn't stick for the whole TTL.
        records.catch(() => {
          cache = null;
        });
      }
      return cache.records;
    },

    async get(id) {
      const result = await fetchKratosIdentityById(id);
      if (!result.ok) return result;
      const profiles = resolveProfiles ? await resolveProfiles([id]) : {};
      const summary = toIdentitySummary(result.identity, profiles[id]);
      if (!summary) return { ok: false, status: 404 };

      let sessions: { active?: unknown; authenticated_at?: unknown }[] = [];
      try {
        const sres = await fetch(
          `${kratosAdminBaseUrl()}/admin/identities/${encodeURIComponent(id)}/sessions`,
          { headers: { Accept: "application/json" } },
        );
        if (sres.ok) sessions = (await sres.json()) as typeof sessions;
      } catch {
        // Sessions are a nice-to-have on this page.
      }
      const lastSignIn = sessions
        .map((s) => s.authenticated_at)
        .filter((at): at is string => typeof at === "string")
        .sort()
        .at(-1);
      const methods = mfaMethods(result.identity);
      return {
        ok: true,
        identity: { ...summary, mfa: methods.length > 0, last_sign_in_at: lastSignIn ?? null },
        mfa_methods: methods,
        active_sessions: sessions.filter((s) => s.active === true).length,
      };
    },
  };
}

/** Case-insensitive match on name or email (substring) or id (prefix). */
export function matchesIdentitySearch(record: IdentitySummary, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    record.id.toLowerCase().startsWith(needle) ||
    (record.email?.toLowerCase().includes(needle) ?? false) ||
    (record.name?.toLowerCase().includes(needle) ?? false)
  );
}
