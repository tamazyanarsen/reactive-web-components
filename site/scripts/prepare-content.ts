// Собирает контент сайта из того, что уже лежит в репозитории: docs/en, docs/ru,
// README пакетов и главные страницы из site/pages. Документация живёт в одном месте
// и читается и на GitHub, и на сайте — здесь только раскладываем файлы и чиним ссылки.
//
// Английский — корень сайта (/guide), русский — /ru/ (/ru/guide). README пакетов
// есть только на английском, поэтому русские страницы ссылаются на них.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const site = resolve(import.meta.dir, "..");
const repo = resolve(site, "..");
const out = join(site, "content");
const GITHUB = "https://github.com/tamazyanarsen/reactive-web-components/blob/main";

const PACKAGES = ["router", "forms", "ui", "cem-plugin", "create"];

/**
 * Переписывает ссылки исходного файла (лежащего в repo по пути sourcePath) под его
 * место на сайте. lang — язык страницы: от него зависит, куда ведут «соседние» ссылки.
 */
const rewriteLinks = (markdown: string, sourcePath: string, lang: "en" | "ru") => {
  const sourceDir = dirname(sourcePath);
  const toRoot = lang === "en" ? "/" : "/ru/";

  return markdown.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (match, target: string) => {
    const [path, hash = ""] = target.split("#");
    const anchor = hash ? `#${hash}` : "";
    const absolute = resolve(sourceDir, path!);
    const fromRepo = relative(repo, absolute).replaceAll("\\", "/");

    // Документы: docs/en/x.md → /x, docs/ru/x.md → /ru/x.
    const doc = fromRepo.match(/^docs\/(en|ru)\/(.+)\.md$/);
    if (doc) return `](${doc[1] === "en" ? "/" : "/ru/"}${doc[2]}${anchor})`;

    // README пакетов — отдельные страницы сайта.
    const pkg = fromRepo.match(/^packages\/([^/]+)\/README\.md$/);
    if (pkg && PACKAGES.includes(pkg[1]!)) return `](/packages/${pkg[1]}${anchor})`;

    // Главный README — главная страница своего языка.
    if (fromRepo === "README.md") return `](/${anchor})`;
    if (fromRepo === "README.ru.md") return `](/ru/${anchor})`;

    // Всё остальное в репозитории (бенчмарк, CONTRIBUTING, исходники) — на GitHub.
    if (!fromRepo.startsWith("..")) return `](${GITHUB}/${fromRepo}${anchor})`;
    return match;
  }).replace(/\]\(\/\)/g, `](${toRoot})`);
};

const copyDocs = async (lang: "en" | "ru") => {
  const sourceDir = join(repo, "docs", lang);
  const targetDir = lang === "en" ? out : join(out, "ru");
  await mkdir(targetDir, { recursive: true });

  for (const file of await readdir(sourceDir)) {
    if (!file.endsWith(".md")) continue;
    const sourcePath = join(sourceDir, file);
    const markdown = await readFile(sourcePath, "utf8");
    // Строка навигации между документами в начале файла на сайте не нужна —
    // её заменяют сайдбар и переключатель языка.
    const withoutNav = markdown.replace(/^(# .+\n)\n\[(English|Русский)\]\([^\n]+\n/, "$1");
    await writeFile(join(targetDir, file), rewriteLinks(withoutNav, sourcePath, lang));
  }
};

const copyPackages = async () => {
  const targetDir = join(out, "packages");
  await mkdir(targetDir, { recursive: true });
  for (const name of PACKAGES) {
    const sourcePath = join(repo, "packages", name, "README.md");
    const markdown = await readFile(sourcePath, "utf8").catch(() => null);
    if (markdown === null) continue;
    await writeFile(join(targetDir, `${name}.md`), rewriteLinks(markdown, sourcePath, "en"));
  }
};

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
// Главные страницы и прочее, написанное специально для сайта.
await cp(join(site, "pages", "en"), out, { recursive: true });
await cp(join(site, "pages", "ru"), join(out, "ru"), { recursive: true });
await copyDocs("en");
await copyDocs("ru");
await copyPackages();

console.log(`content ready: ${relative(repo, out)}`);
