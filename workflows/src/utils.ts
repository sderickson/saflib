import { readFileSync } from "fs";
import { join } from "path";

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

export function kebabCaseToPascalCase(str: string) {
  const words = str.split("-");
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function kebabCaseToCamelCase(name: string) {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export function kebabCaseToSnakeCase(name: string) {
  return name.replace(/-/g, "_");
}

export function allChildrenSettled(snapshot: any) {
  return Object.values(snapshot.children).every(
    (child: any) => child && child.getSnapshot().status !== "active",
  );
}

export const print = (msg: string, noNewLine = false) => {
  if (!noNewLine) {
    console.log("");
  }
  console.log(addNewLinesToString(msg));
};

export const getCurrentPackage = () => {
  const currentPackage = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8",
  );
  return JSON.parse(currentPackage).name;
};
