// Манифест компонентов кита: из него редакторы, Storybook и генераторы обёрток для
// фреймворков узнают теги, атрибуты, свойства и события. Собирается в bun run build.
import { rwcPlugin } from "../cem-plugin/index.js";

export default {
  globs: ["src/components/*.ts"],
  exclude: ["src/components/*.test.ts"],
  outdir: ".",
  plugins: [rwcPlugin()],
};
