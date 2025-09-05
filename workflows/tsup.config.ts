import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts", "workflows/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "esnext",
  splitting: false,
  treeshake: true,
});
