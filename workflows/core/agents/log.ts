import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

export const logFile = path.join(process.cwd(), "saf-workflow-prompt.log");
export const costFile = path.join(process.cwd(), "saf-workflow-cost.tsv");

export interface CostTsvRow {
  timestamp_start: string;
  timestamp_end: string;
  duration_ms: string;
  duration_api_ms: string;
  status: string;
  request_id: string;
  message: string;
}

const rowOrder = [
  "timestamp_start",
  "timestamp_end",
  "duration_ms",
  "duration_api_ms",
  "status",
  "request_id",
  "message",
] as const;

const escapeTsvCell = (cell: string) => {
  return `"${cell.replace(/\t/g, "    ")}"`;
};

export const appendToCostFile = (tsvRow: CostTsvRow) => {
  const csvFileExists = existsSync(costFile);
  if (!csvFileExists) {
    writeFileSync(costFile, rowOrder.join("\t") + "\n", { flag: "w" });
  }
  writeFileSync(
    costFile,
    rowOrder.map((key) => escapeTsvCell(tsvRow[key])).join("\t") + "\n",
    {
      flag: "a",
    },
  );
};
