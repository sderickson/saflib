import type { Job } from "@saflib/jobs-spec";

export const statusColor = (status: Job["status"] | null | undefined): string => {
  switch (status) {
    case "succeeded":
      return "success";
    case "dead":
    case "cancelled":
      return "error";
    case "running":
      return "info";
    case "retrying":
      return "warning";
    default:
      return "grey";
  }
};

export const canRetry = (status: Job["status"]) => status === "dead" || status === "cancelled";
export const canCancel = (status: Job["status"]) => status === "pending" || status === "retrying";

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/** "rejected-by-endpoint" → "Rejected by endpoint". */
export const humanize = (s: string | null | undefined): string => {
  if (!s) return "—";
  const words = s.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Pretty JSON for a stored body: parses JSON strings, leaves plain text alone. */
export const prettyBody = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

/** The request parts worth showing (empty path params / query / body dropped). */
export const requestParts = (request: Job["request"]): { label: string; text: string }[] => {
  const parts: { label: string; text: string }[] = [];
  const nonEmpty = (v: unknown) => v != null && !(typeof v === "object" && Object.keys(v as object).length === 0);
  if (nonEmpty(request.path_params)) parts.push({ label: "Path", text: prettyBody(request.path_params)! });
  if (nonEmpty(request.query)) parts.push({ label: "Query", text: prettyBody(request.query)! });
  if (nonEmpty(request.body)) parts.push({ label: "Body", text: prettyBody(request.body)! });
  return parts;
};
