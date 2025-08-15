const regexCharacters = ["(", ")", ".", "*", "+", "?", "^", "$", "|", "/"];

/**
 * Utility function to convert the vue-i18n message format syntax to a
 * regex for finding an instance of that string, in particular for tests.
 * https://vue-i18n.intlify.dev/guide/essentials/syntax.html
 *
 * This is stored and exported separately from the rest of this package
 * so that libraries such as playwright don't import vue files, which
 * they can't handle.
 */
export const convertI18NInterpolationToRegex = (str: string) => {
  if (str.includes("{")) {
    let escapedStr = str;
    for (const char of regexCharacters) {
      escapedStr = escapedStr.replace(char, `\\${char}`);
    }
    return new RegExp(escapedStr.replace(/\{(.*?)\}/g, ".*"));
  }
  return str;
};
