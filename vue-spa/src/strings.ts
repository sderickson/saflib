import { useI18n } from "vue-i18n";

export const makeStringToKeyMap = (
  strings: I18nMessages,
  acc: Record<string, string> = {},
  prefix: string = "",
) => {
  return Object.entries(strings).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      if (acc[value] && process.env.NODE_ENV !== "test") {
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

export const makeReverseTComposable = (strings: I18nMessages) => {
  const stringToKeyMap = makeStringToKeyMap(strings);
  return () => {
    const { t } = useI18n();
    const lookupTKey = (s: string) => {
      return stringToKeyMap[s] ?? s;
    };
    const wrappedT = (s: string) => {
      return stringToKeyMap[s] ? t(lookupTKey(s)) : s;
    };
    return {
      t: wrappedT,
      lookupTKey,
    };
  };
};
