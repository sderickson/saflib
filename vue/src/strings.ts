import { useI18n } from "vue-i18n";

const makeStringToKeyMap = (
  strings: I18nMessages,
  acc: Map<string | object, string> = new Map(),
  prefix: string = "",
) => {
  return Object.entries(strings).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      if (acc.get(value) && process.env.NODE_ENV !== "test") {
        console.warn(
          `Duplicate string entries for "${value}" in ${prefix + key} and ${acc.get(value)}`,
        );
      }
      acc.set(value, prefix + key);
    } else if (Array.isArray(value)) {
      acc.set(value, prefix + key);
      for (const i in value) {
        if (typeof value[i] === "string") {
          acc.set(value[i], prefix + key + "." + i);
        } else {
          acc = makeStringToKeyMap(value[i], acc, prefix + key + ".");
        }
      }
    } else if (typeof value === "object") {
      acc.set(value, prefix + key);
      acc = makeStringToKeyMap(value, acc, prefix + key + ".");
    }
    return acc;
  }, acc);
};

/**
 * Generic interface for vue-i18n translation objects supported by SAF.
 */
export interface I18nMessages {
  [key: string]: string | string[] | I18nMessages | Array<I18nMessages>;
}

/**
 * Interface for flat vue-i18n objects, where each key is a string. Used most commonly for strings which are shared for a single HTML element.
 */
export interface I18NObject {
  [key: string]: string;
}

/**
 * Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings.
 */
export const makeReverseTComposable = (strings: I18nMessages) => {
  const stringToKeyMap = makeStringToKeyMap(strings);
  return () => {
    const { t } = useI18n();
    const lookupTKey = (s: string) => {
      return stringToKeyMap.get(s) ?? s;
    };
    // Function overloads to preserve input type
    function wrappedT(s: string): string;
    function wrappedT(s: I18NObject): I18NObject;
    function wrappedT(s: string | I18NObject): string | I18NObject {
      if (typeof s === "string") {
        return stringToKeyMap.get(s) ? t(lookupTKey(s)) : s;
      } else {
        return tObject(s);
      }
    }
    const tObject = (o: I18NObject): I18NObject => {
      return Object.fromEntries(
        Object.entries(o).map(([key, value]) => [
          key,
          stringToKeyMap.get(value) ? t(lookupTKey(value)) : value,
        ]),
      );
    };
    return {
      t: wrappedT,
      lookupTKey,
    };
  };
};
