// Манифест для галереи examples/: проверка плагина на живых компонентах и
// источник автодополнения тегов в редакторе. Запуск: bun run cem.
import { rwcPlugin } from "./packages/cem-plugin/index.js";

export default {
  globs: ["examples/*.ts"],
  exclude: ["examples/index.ts", "examples/shared.ts"],
  outdir: "examples",
  plugins: [rwcPlugin()],
};
