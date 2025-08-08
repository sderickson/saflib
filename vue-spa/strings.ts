import type { I18nMessages } from ".";

export const makeStringToKeyMap = (
  strings: I18nMessages,
  acc: Record<string, string> = {},
  prefix: string = "",
) => {
  return Object.entries(strings).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[value] = prefix + key;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        acc = makeStringToKeyMap(item, acc, prefix + key + ".");
      }
    } else if (typeof value === "object") {
      acc = makeStringToKeyMap(value, acc, prefix + key + ".");
    }
    return acc;
  }, acc);
};
