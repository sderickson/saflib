/**
 * Shared Kratos Admin API helpers (identity lookup by id / email).
 *
 * Uses `KRATOS_ADMIN_API_URL` (default `http://kratos:4434`).
 */

export function kratosAdminBaseUrl(): string {
  const raw = process.env.KRATOS_ADMIN_API_URL ?? "http://kratos:4434";
  return raw.replace(/\/$/, "");
}

function emailFromKratosIdentity(identity: unknown): string | null {
  if (!identity || typeof identity !== "object") {
    return null;
  }

  const traits = (identity as { traits?: Record<string, unknown> }).traits;
  const email = traits?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

/**
 * Resolves a user's id from the Kratos admin API by email.
 * Returns `null` when the lookup fails or no identity matches.
 */
export async function resolveUserIdByEmail(
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase().trim();
  const url = `${kratosAdminBaseUrl()}/admin/identities?credentials_identifier=${encodeURIComponent(normalized)}`;

  let kres: Response;
  try {
    kres = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return null;
  }

  if (!kres.ok) {
    return null;
  }

  try {
    const body: unknown = await kres.json();
    if (!Array.isArray(body) || body.length === 0) {
      return null;
    }

    const first = body[0];
    if (!first || typeof first !== "object" || !("id" in first)) {
      return null;
    }

    const id = (first as { id: unknown }).id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a Kratos identity by id from the admin API.
 */
export async function fetchKratosIdentityById(
  id: string,
): Promise<
  { ok: true; identity: unknown } | { ok: false; status: number }
> {
  const url = `${kratosAdminBaseUrl()}/admin/identities/${encodeURIComponent(id)}`;

  let kres: Response;
  try {
    kres = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return { ok: false, status: 0 };
  }

  if (!kres.ok) {
    return { ok: false, status: kres.status };
  }

  try {
    return { ok: true, identity: await kres.json() };
  } catch {
    return { ok: false, status: kres.status };
  }
}

/**
 * Resolves a member's email from the Kratos admin API.
 * Returns `null` when the lookup fails.
 */
export async function resolveEmailFromIdentityId(
  userId: string,
): Promise<string | null> {
  const result = await fetchKratosIdentityById(userId);
  if (!result.ok) {
    return null;
  }
  return emailFromKratosIdentity(result.identity);
}
