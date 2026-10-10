import { defineConfig } from "vite";

// `vite` serves the demo (index.html), `vite build` builds the library from src/index.ts.
export default defineConfig({
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
    // The core comes from the consuming app, so every component shares one copy of it.
    rollupOptions: { external: ["@rwcjs/core"] },
  },
});
