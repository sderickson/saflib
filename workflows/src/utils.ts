/**
 * Given a string which may have newlines already included, add /n to each line such that no line is longer than maxLineWidth.
 */
export function addNewLinesToString(str: string, maxLineWidth: number = 80) {
  return str
    .split("\n")
    .map((line) => addNewLinesToLine(line, maxLineWidth))
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
      currentLine = word;
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
