import { resolve } from "node:path";
import { defineConfig, type DefaultTheme } from "vitepress";

const repo = resolve(__dirname, "../..");

const packagesSidebar: DefaultTheme.SidebarItem = {
  text: "Packages",
  items: [
    { text: "@rwcjs/ui", link: "/packages/ui" },
    { text: "@rwcjs/router", link: "/packages/router" },
    { text: "@rwcjs/forms", link: "/packages/forms" },
    { text: "@rwcjs/create", link: "/packages/create" },
    { text: "@rwcjs/cem-plugin", link: "/packages/cem-plugin" },
  ],
};

const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "Documentation",
    items: [
      { text: "Guide", link: "/guide" },
      { text: "API reference", link: "/api" },
      { text: "Recipes", link: "/recipes" },
      { text: "Frameworks", link: "/frameworks" },
      { text: "Server rendering", link: "/ssr" },
      { text: "Ecosystem", link: "/ecosystem" },
    ],
  },
  packagesSidebar,
];

const ruSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "Документация",
    items: [
      { text: "Гайд", link: "/ru/guide" },
      { text: "Справочник API", link: "/ru/api" },
      { text: "Рецепты", link: "/ru/recipes" },
      { text: "Фреймворки", link: "/ru/frameworks" },
      { text: "Серверный рендер", link: "/ru/ssr" },
      { text: "Экосистема", link: "/ru/ecosystem" },
    ],
  },
  { ...packagesSidebar, text: "Пакеты (англ.)" },
];

export default defineConfig({
  title: "rwc",
  description: "Reactive web components on signals",
  srcDir: "content",
  // GitHub Pages отдаёт сайт из подкаталога с именем репозитория.
  base: process.env.SITE_BASE ?? "/reactive-web-components/",
  cleanUrls: true,
  lastUpdated: false,
  head: [["meta", { name: "theme-color", content: "#4f46e5" }]],

  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/tamazyanarsen/reactive-web-components" }],
    search: { provider: "local" },
  },

  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide" },
          { text: "API", link: "/api" },
          { text: "UI kit", link: "/packages/ui" },
          { text: "Changelog", link: "https://github.com/tamazyanarsen/reactive-web-components/blob/main/CHANGELOG.md" },
        ],
        sidebar: enSidebar,
      },
    },
    ru: {
      label: "Русский",
      lang: "ru",
      link: "/ru/",
      themeConfig: {
        nav: [
          { text: "Гайд", link: "/ru/guide" },
          { text: "API", link: "/ru/api" },
          { text: "UI-кит", link: "/packages/ui" },
          { text: "Изменения", link: "https://github.com/tamazyanarsen/reactive-web-components/blob/main/CHANGELOG.md" },
        ],
        sidebar: ruSidebar,
        outline: { label: "На этой странице" },
        docFooter: { prev: "Назад", next: "Далее" },
        darkModeSwitchLabel: "Тема",
        sidebarMenuLabel: "Меню",
        returnToTopLabel: "Наверх",
      },
    },
  },

  vite: {
    resolve: {
      // Живые примеры собираются из исходников репозитория — сайт всегда показывает
      // текущий код, а не последнюю опубликованную версию.
      alias: {
        "@rwcjs/core": resolve(repo, "index.ts"),
        "@rwcjs/ui/theme.css": resolve(repo, "packages/ui/src/theme.css"),
        "@rwcjs/ui": resolve(repo, "packages/ui/src/index.ts"),
        "@rwcjs/router": resolve(repo, "packages/router/src/index.ts"),
        "@rwcjs/forms": resolve(repo, "packages/forms/src/index.ts"),
      },
    },
    server: { fs: { allow: [repo] } },
  },
});
