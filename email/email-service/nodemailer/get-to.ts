import type { EmailOptions } from "../types.ts";

export function getTo(options: EmailOptions): string[] {
  if (Array.isArray(options.to)) {
    return options.to.map((t) => (typeof t === "string" ? t : t.address));
  }
  if (typeof options.to === "string") {
    return [options.to];
  }
  if (options.to && options.to.address) {
    return [options.to.address];
  }
  return [];
}
