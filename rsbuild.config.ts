import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  plugins: [],
  source: {
    tsconfigPath: "./tsconfig.json",
    decorators: {
      version: "legacy",
    },
    entry: {
      index: "./src/main.ts",
    },
  },
});
