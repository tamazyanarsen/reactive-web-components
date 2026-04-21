import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RsbuildPlugin } from "@rsbuild/core";
import { defineConfig } from "@rslib/core";
import { pluginSass } from "@rsbuild/plugin-sass";

import pkg from "./package.json";

const rootPkg = JSON.parse(readFileSync("./package.json", "utf8"));
const isWatch = process.argv.includes("--watch");

const genDistPkg = (): RsbuildPlugin => ({
  name: "gen-dist-pkg",
  setup(api) {
    api.onAfterBuild(() => {
      const version = isWatch
        ? `${rootPkg.version}-dev.${Date.now()}`
        : rootPkg.version;

      const dist = {
        name: rootPkg.name,
        version,
        type: rootPkg.type,
        exports: {
          ".": {
            types: "./index.d.ts",
            import: "./index.js",
          },
        },
        types: "./index.d.ts",
        ...(rootPkg.peerDependencies && {
          peerDependencies: rootPkg.peerDependencies,
        }),
        ...(rootPkg.dependencies && { dependencies: rootPkg.dependencies }),
      };

      writeFileSync(
        resolve("dist/package.json"),
        JSON.stringify(dist, null, 2) + "\n",
      );

      console.log(`dist/package.json → ${dist.version}`);
    });
  },
});

export default defineConfig({
  performance: {
    printFileSize: {
      compressed: true,
    },
  },
  plugins: [pluginSass(), genDistPkg()],
  source: {
    tsconfigPath: "tsconfig.lib.json",
    define: {
      "import.meta.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
    },
    entry: {
      index: "./src/shared/index.ts",
    },
  },
  // resolve: {
  // alias: {
  //   "@": "./src",
  //   "@shared": "./src/shared",
  // },
  // },
  lib: [
    {
      format: "esm",
      syntax: ["node 22"],
      dts: true,
    },
  ],
  output: {
    minify: {
      jsOptions: {
        minimizerOptions: {
          compress: true,
        },
      },
    },
  },
});
