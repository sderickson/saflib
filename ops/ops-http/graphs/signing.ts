import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Parameters a graph link renders. All absolute, so a link always shows the
 * same graph; the signature covers every one of them.
 */
export interface GraphLinkParams {
  q: string;
  /** Unix seconds. */
  start: number;
  end: number;
  step: number;
  w: number;
  h: number;
  title: string;
}

/** Canonical form signed: fixed key order, one `key=value` per line. */
export function canonicalGraphParams(p: GraphLinkParams, kid: string): string {
  return [
    `kid=${kid}`,
    `q=${p.q}`,
    `start=${p.start}`,
    `end=${p.end}`,
    `step=${p.step}`,
    `w=${p.w}`,
    `h=${p.h}`,
    `title=${p.title}`,
  ].join("\n");
}

export function signGraphParams(p: GraphLinkParams, kid: string, secret: string): string {
  return createHmac("sha256", secret).update(canonicalGraphParams(p, kid)).digest("base64url");
}

export function verifyGraphSignature(
  p: GraphLinkParams,
  kid: string,
  secret: string,
  sig: string,
): boolean {
  const expected = Buffer.from(signGraphParams(p, kid, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Query string for a signed link (the same params, plus kid and sig).
 * Percent-encoded throughout (spaces as %20, not +): `+` is a reserved
 * character the request validator rejects.
 */
export function graphLinkQuery(p: GraphLinkParams, kid: string, sig: string): string {
  const pairs: [string, string][] = [
    ["q", p.q],
    ["start", String(p.start)],
    ["end", String(p.end)],
    ["step", String(p.step)],
    ["w", String(p.w)],
    ["h", String(p.h)],
    ["title", p.title],
    ["kid", kid],
    ["sig", sig],
  ];
  // An empty title is left out (the validator rejects empty values); it
  // reads back as "" and is signed as "".
  return pairs
    .filter(([k, v]) => !(k === "title" && v === ""))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}
