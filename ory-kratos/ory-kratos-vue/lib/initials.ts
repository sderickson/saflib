/** Two initials from a name ("Ada Lovelace" → "AL"), else from an email ("ada@x" → "AD"). */
export function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  const local = (email ?? "").split("@")[0] ?? "";
  return local.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}
