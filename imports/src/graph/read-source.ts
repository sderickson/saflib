import fs from "node:fs";

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * Read a source file for import extraction.
 * For `.vue` SFCs, concatenate `<script>` / `<script setup>` / `<script lang="ts">`
 * bodies via regex — no `@vue/compiler-sfc`.
 */
export function readSource(filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!filePath.endsWith(".vue")) return raw;

  const bodies: string[] = [];
  const re = new RegExp(SCRIPT_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const attrs = m[1] ?? "";
    // Skip external script references with no inline body of interest.
    if (/\bsrc\s*=/.test(attrs)) continue;
    const body = m[2] ?? "";
    if (body.trim()) bodies.push(body);
  }
  return bodies.join("\n");
}
