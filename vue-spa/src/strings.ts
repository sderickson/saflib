export const makeStringToKeyMap = (
  strings: I18nMessages,
  acc: Record<string, string> = {},
  prefix: string = "",
) => {
  return Object.entries(strings).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      if (acc[value]) {
        console.warn(
          `Duplicate string entries for "${value}" in ${prefix + key} and ${acc[value]}`,
        );
      }
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

export interface I18nMessages {
  [key: string]: string | Array<I18nMessages> | I18nMessages;
}
