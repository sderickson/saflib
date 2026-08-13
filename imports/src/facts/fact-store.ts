import {
  buildFileSpecialty,
  countSourceLines,
  type FileSpecialty,
} from "./specialty.ts";

/** Bump when specialty shape or extractors change incompatibly. */
export const ANALYZER_VERSION = "7";

/**
 * Content-addressed parse result for one file.
 * `contentKey` is a git blob hash (Spec) or content hash (workdir / CI).
 */
export interface FileFact {
  contentKey: string;
  analyzerVersion: string;
  lineCount: number;
  specialty: FileSpecialty;
  computedAt: Date;
}

export interface FactStore {
  get(contentKeys: string[]): Promise<Map<string, FileFact>>;
  put(facts: FileFact[]): Promise<void>;
}

/** In-memory FactStore for workdir / CI (no SQLite). */
export class MemoryFactStore implements FactStore {
  private readonly byKey = new Map<string, FileFact>();

  async get(contentKeys: string[]): Promise<Map<string, FileFact>> {
    const out = new Map<string, FileFact>();
    for (const key of contentKeys) {
      const fact = this.byKey.get(key);
      if (fact && fact.analyzerVersion === ANALYZER_VERSION) {
        out.set(key, fact);
      }
    }
    return out;
  }

  async put(facts: FileFact[]): Promise<void> {
    for (const fact of facts) {
      this.byKey.set(fact.contentKey, fact);
    }
  }

  /** Parse source and store under contentKey; returns the fact. */
  async ensureFromSource(
    contentKey: string,
    source: string,
  ): Promise<FileFact> {
    const existing = this.byKey.get(contentKey);
    if (existing && existing.analyzerVersion === ANALYZER_VERSION) {
      return existing;
    }
    const fact: FileFact = {
      contentKey,
      analyzerVersion: ANALYZER_VERSION,
      lineCount: countSourceLines(source),
      specialty: buildFileSpecialty(source),
      computedAt: new Date(),
    };
    this.byKey.set(contentKey, fact);
    return fact;
  }
}

export function fileFactFromSource(
  contentKey: string,
  source: string,
): FileFact {
  return {
    contentKey,
    analyzerVersion: ANALYZER_VERSION,
    lineCount: countSourceLines(source),
    specialty: buildFileSpecialty(source),
    computedAt: new Date(),
  };
}
