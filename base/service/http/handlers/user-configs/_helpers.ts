import type { UserConfigEntity } from "@saflib/base-db/types";
import type { UserConfig } from "@saflib/base-spec/schemas/UserConfig";
import { getSafReporters } from "@saflib/node";

/** Maps a persisted `user_config` row to the OpenAPI `UserConfig` resource. */
export function mapUserConfigEntityToApi(entity: UserConfigEntity): UserConfig {
  return {
    userId: entity.userId,
    displayName: entity.displayName,
    marketingEmailsOptIn: entity.marketingEmailsOptIn,
    marketingEmailsOptInAt: entity.marketingEmailsOptInAt?.toISOString() ?? null,
    termsOfServiceAgreedAt:
      entity.termsOfServiceAgreedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function kratosAdminBaseUrl(): string {
  const raw = process.env.KRATOS_ADMIN_API_URL ?? "http://kratos:4434";
  return raw.replace(/\/$/, "");
}

/** Resolves a user's id from the Kratos admin API by email. Returns null when lookup fails. */
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
  } catch (e) {
    const { log } = getSafReporters();
    log.error("kratos identity lookup failed", { err: e });
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
