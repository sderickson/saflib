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

/**
 * Strings that are exported by client packages will be in objects like these. Their values match valid HTML attributes.
 */
export interface ElementStringObject {
  role?: "button" | "combobox" | "option" | "heading" | "link";
  text?: string;
  "data-testid"?: string;
  placeholder?: string;
  "aria-label"?: string;
  label?: string;
}

/**
 * A string for an HTML element can either be a plain string, or an object with valid HTML attributes.
 */
export type ElementString = string | ElementStringObject;

export function sanitizeFilename(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "_")
    .replace(/[<>:"/\\|?*\s]+/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 255);
}
