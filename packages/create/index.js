#!/usr/bin/env node
// Генератор проектов на rwc: npm create @rwcjs@latest my-app
//
// Без зависимостей — только node:*. Шаблоны лежат рядом в templates/ и копируются
// как есть; в package.json подставляется имя проекта.
import { existsSync, readdirSync, statSync } from "node:fs";
import { cp, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { stdin, stdout, argv, exit, cwd, env } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const TEMPLATES = {
  app: "Application: Vite, router, forms, an example component",
  library: "Component library: Vite library build, Custom Elements Manifest",
};

const here = dirname(fileURLToPath(import.meta.url));

const parseArgs = (args) => {
  const options = { name: undefined, template: undefined, yes: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--template" || arg === "-t") options.template = args[++i];
    else if (arg.startsWith("--template=")) options.template = arg.slice("--template=".length);
    else if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (!arg.startsWith("-") && !options.name) options.name = arg;
  }
  return options;
};

const usage = `Usage: npm create @rwcjs@latest [project-name] -- [--template app|library] [--yes]

Templates:
${Object.entries(TEMPLATES)
  .map(([name, description]) => `  ${name.padEnd(8)} ${description}`)
  .join("\n")}`;

/** Имя пакета npm из имени каталога: строчные буквы, без пробелов и лишних символов. */
const toPackageName = (name) =>
  basename(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-") || "rwc-app";

const isEmptyDir = (path) => !existsSync(path) || readdirSync(path).filter((entry) => entry !== ".git").length === 0;

/** Менеджер пакетов, которым запустили генератор, — им же и предлагаем ставить. */
const packageManager = () => {
  const agent = env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("bun")) return "bun";
  return "npm";
};

const main = async () => {
  const options = parseArgs(argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const interactive = stdin.isTTY && !options.yes;
  const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null;
  const ask = async (question, fallback) => {
    if (!rl) return fallback;
    const answer = (await rl.question(`${question} (${fallback}): `)).trim();
    return answer || fallback;
  };

  try {
    const name = options.name ?? (await ask("Project name", "rwc-app"));

    let template = options.template;
    if (!template) {
      if (rl) {
        console.log(Object.entries(TEMPLATES).map(([key, text]) => `  ${key}: ${text}`).join("\n"));
      }
      template = await ask("Template", "app");
    }
    if (!(template in TEMPLATES)) {
      console.error(`Unknown template "${template}".\n\n${usage}`);
      exit(1);
    }

    const target = resolve(cwd(), name);
    if (!isEmptyDir(target)) {
      console.error(`${relative(cwd(), target) || "."} is not empty. Choose another name or empty it.`);
      exit(1);
    }

    await cp(join(here, "templates", template), target, { recursive: true });

    // npm при публикации выбрасывает .gitignore из пакета, поэтому в шаблоне он _gitignore.
    const gitignore = join(target, "_gitignore");
    if (existsSync(gitignore)) await rename(gitignore, join(target, ".gitignore"));

    const manifestPath = join(target, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.name = toPackageName(name);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const pm = packageManager();
    const dir = relative(cwd(), target);
    const run = pm === "npm" ? "npm run" : pm;
    console.log(`
Done. Next steps:

  ${dir && dir !== "." ? `cd ${dir.includes(" ") ? `"${dir}"` : dir}\n  ` : ""}${pm} install
  ${run} dev
`);
  } finally {
    rl?.close();
  }
};

// Шаблоны не должны случайно потерять файлы при упаковке — проверяем, что каталог на месте.
if (!statSync(join(here, "templates"), { throwIfNoEntry: false })?.isDirectory()) {
  console.error("Templates are missing from the package.");
  exit(1);
}

await main();
