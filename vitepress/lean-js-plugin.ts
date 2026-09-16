/**
 * VitePress 1.6.x emits `.lean.js` page chunks by assigning into the Rollup
 * `bundle` object. Rolldown (Vite 8) ignores that mutation, so HTML still
 * preloads `*.lean.js` while the file is missing / empty — browsers then
 * refuse the module (empty MIME with `nosniff`).
 *
 * Emit lean copies via `this.emitFile` instead. Functional stand-in until
 * VitePress ships a Rolldown-safe release on the 1.x line.
 */
export function vitepressLeanJsRolldownCompat() {
  return {
    name: "saflib-vitepress-lean-js-rolldown-compat",
    apply: "build" as const,
    generateBundle: {
      order: "post" as const,
      handler(
        this: { emitFile: (asset: { type: "asset"; fileName: string; source: string }) => void },
        _options: unknown,
        bundle: Record<string, { type?: string; isEntry?: boolean; fileName?: string; code?: string }>,
      ) {
        const existing = new Set(
          Object.values(bundle)
            .map((chunk) => chunk.fileName)
            .filter((name): name is string => typeof name === "string"),
        );

        for (const chunk of Object.values(bundle)) {
          const isChunk = !("type" in chunk) || chunk.type === "chunk";
          if (!isChunk || !chunk.isEntry || typeof chunk.fileName !== "string") {
            continue;
          }
          if (!/\.md\.[^/]+\.js$/.test(chunk.fileName)) {
            continue;
          }
          if (chunk.fileName.endsWith(".lean.js")) {
            continue;
          }
          const leanName = chunk.fileName.replace(/\.js$/, ".lean.js");
          if (existing.has(leanName) || typeof chunk.code !== "string") {
            continue;
          }
          this.emitFile({
            type: "asset",
            fileName: leanName,
            source: chunk.code,
          });
          existing.add(leanName);
        }
      },
    },
  };
}
