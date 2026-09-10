import { vi } from "vitest";

export type DocumentLocationStub = {
  hostname: string;
  host?: string;
  protocol?: string;
  href?: string;
};

const restoreFns: Array<() => void> = [];

function pushRestore(restore: () => void): void {
  restoreFns.push(restore);
}

function buildLocation(location: DocumentLocationStub) {
  const host = location.host ?? location.hostname;
  const protocol = location.protocol ?? "http:";
  return {
    hostname: location.hostname,
    host,
    protocol,
    href: location.href ?? `${protocol}//${host}/`,
  };
}

/** Stub `document.location` without replacing the full `document` (safe under jsdom + isolate: false). */
export function stubDocumentLocation(location: DocumentLocationStub): void {
  const loc = buildLocation(location);

  if (typeof document !== "undefined") {
    const previousDocument = globalThis.document;
    vi.stubGlobal("document", {
      ...previousDocument,
      location: loc,
    });
    pushRestore(() => {
      vi.stubGlobal("document", previousDocument);
    });
    return;
  }

  vi.stubGlobal("document", { location: loc });
  pushRestore(() => {
    vi.unstubAllGlobals();
  });
}

/** Force backend-style resolution (no browser document), for link/env tests in Node. */
export function clearDocumentStub(): void {
  if (typeof document !== "undefined") {
    const previousDocument = globalThis.document;
    vi.stubGlobal("document", undefined);
    pushRestore(() => {
      vi.stubGlobal("document", previousDocument);
    });
    return;
  }

  vi.stubGlobal("document", undefined);
  pushRestore(() => {
    vi.unstubAllGlobals();
  });
}

/** Undo the most recent stub stack from this module (call in afterEach). */
export function restoreDocumentLocationStub(): void {
  while (restoreFns.length > 0) {
    restoreFns.pop()?.();
  }
}
