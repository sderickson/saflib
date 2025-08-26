/**
 * Given a string which may have newlines already included, add /n to each line such that no line is longer than maxLineWidth.
 */
export function addNewLinesToString(str: string, maxLineWidth: number = 80) {
  return str
    .split("\n")
    .map((line) => addNewLinesToLine(line, maxLineWidth))
    .map((line) => line.trim())
    .join("\n");
}

function addNewLinesToLine(str: string, maxLineWidth: number = 80) {
  const words = str.split(" ");
  const lines = [];
  let currentLine = words.shift() ?? "";
  while (words.length > 0) {
    const word = words.shift() ?? "";
    if ((currentLine + " " + word).length > maxLineWidth) {
      lines.push(currentLine);
      currentLine = "   " + word;
    } else {
      currentLine = currentLine + " " + word;
    }
  }
  lines.push(currentLine);
  return lines.join("\n");
}

/**
 * Convert a kebab-case string to PascalCase.
 */
export function kebabCaseToPascalCase(str: string) {
  const words = str.split("-");
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Convert a kebab-case string to camelCase.
 */
export function kebabCaseToCamelCase(name: string) {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

/**
 * Convert a kebab-case string to snake_case.
 */
export function kebabCaseToSnakeCase(name: string) {
  return name.replace(/-/g, "_");
}

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
