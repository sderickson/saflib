import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts", "workflows/index.ts"],
  format: ["esm"],
  dts: {
    resolve: true,
  },
  sourcemap: true,
  clean: true,
  outDir: "dist/src",
  target: "esnext",
  splitting: false,
  treeshake: true,
});
