import { resolve } from "node:path";
import { defineConfig, type DefaultTheme } from "vitepress";

const repo = resolve(__dirname, "../..");

const packagesSidebar: DefaultTheme.SidebarItem = {
  text: "Packages",
  items: [
    { text: "@rwcjs/ui", link: "/packages/ui" },
    { text: "UI kit gallery", link: "/ui-gallery" },
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
      { text: "Microfrontends", link: "/microfrontends" },
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
      { text: "Микрофронтенды", link: "/ru/microfrontends" },
      { text: "Фреймворки", link: "/ru/frameworks" },
      { text: "Серверный рендер", link: "/ru/ssr" },
      { text: "Экосистема", link: "/ru/ecosystem" },
    ],
  },
  {
    text: "Пакеты (англ.)",
    items: [
      { text: "@rwcjs/ui", link: "/packages/ui" },
      { text: "Галерея UI-кита", link: "/ru/ui-gallery" },
      ...packagesSidebar.items!.filter((item) => item.link?.startsWith("/packages/") && item.link !== "/packages/ui"),
    ],
  },
];

// GitHub Pages отдаёт сайт из подкаталога с именем репозитория.
const base = process.env.SITE_BASE ?? "/reactive-web-components/";

export default defineConfig({
  title: "rwc",
  description: "Reactive web components on signals",
  srcDir: "content",
  base,
  cleanUrls: true,
  lastUpdated: false,
  // head не учитывает base сам: путь к иконке собираем вручную.
  head: [
    ["meta", { name: "theme-color", content: "#4f46e5" }],
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
  ],

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
