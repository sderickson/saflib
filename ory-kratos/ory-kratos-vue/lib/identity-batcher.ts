import type { IdentitySummary } from "@saflib/ory-kratos-spec";

const KRATOS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kratos ids are UUIDs; anything else (`system`, `ops_token:…`) isn't a person. */
export const isKratosId = (id: string) => KRATOS_ID_PATTERN.test(id);

/** Matches the API's `maxItems`. */
const MAX_BATCH = 200;

type Fetch = (ids: string[]) => Promise<IdentitySummary[]>;

interface Pending {
  resolve: (value: IdentitySummary | null) => void;
  reject: (error: unknown) => void;
}

/**
 * Collects every id asked for within one tick and fetches them together, so
 * a table of 50 rows makes one request, not 50. DataLoader-style.
 */
export function createIdentityBatcher(fetchIdentities: Fetch) {
  let queue = new Map<string, Pending[]>();
  let scheduled = false;

  async function flush() {
    scheduled = false;
    const batch = queue;
    queue = new Map();
    const ids = [...batch.keys()];
    for (let i = 0; i < ids.length; i += MAX_BATCH) {
      const chunk = ids.slice(i, i + MAX_BATCH);
      try {
        const found = await fetchIdentities(chunk);
        const byId = new Map(found.map((s) => [s.id, s]));
        for (const id of chunk) {
          for (const p of batch.get(id) ?? []) p.resolve(byId.get(id) ?? null);
        }
      } catch (error) {
        for (const id of chunk) {
          for (const p of batch.get(id) ?? []) p.reject(error);
        }
      }
    }
  }

  return function load(id: string): Promise<IdentitySummary | null> {
    return new Promise((resolve, reject) => {
      const waiting = queue.get(id) ?? [];
      waiting.push({ resolve, reject });
      queue.set(id, waiting);
      if (!scheduled) {
        scheduled = true;
        setTimeout(flush, 0);
      }
    });
  };
}
