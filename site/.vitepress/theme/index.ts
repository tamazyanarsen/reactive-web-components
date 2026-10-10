import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { useData } from "vitepress";
import { h, watchEffect } from "vue";
import "@rwcjs/ui/theme.css";
import Demo from "./Demo.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Demo", Demo);
  },
  setup() {
    // Тёмная схема VitePress → data-theme для кита: компоненты в примерах
    // переключаются вместе с сайтом, а не по настройкам системы.
    const { isDark } = useData();
    watchEffect(() => {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = isDark.value ? "dark" : "light";
      }
    });
  },
  Layout: () => h(DefaultTheme.Layout),
} satisfies Theme;
