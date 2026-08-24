import { defineConfig } from "tsup";

import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  clean: true,
  define: {
    __RAILWAY_SDK_VERSION__: JSON.stringify(pkg.version),
  },
  dts: true,
  entry: ["src/index.ts", "src/iac/index.ts"],
  format: ["esm", "cjs"],
  sourcemap: true,
  splitting: false,
  target: "node22",
  treeshake: true,
});
