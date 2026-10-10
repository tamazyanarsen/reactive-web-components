// Публикует пакеты монорепозитория, чьей версии ещё нет в реестре: корневой @rwcjs/core
// и всё из packages/*. Так релиз одного пакета не требует трогать остальные, а повторный
// запуск ничего не сломает — уже опубликованное пропускается.
//
// Публикация идёт через npm, а не bun publish: provenance умеет только npm.
import { $ } from "bun";
import { readdir } from "node:fs/promises";

type Manifest = { name: string; version: string; private?: boolean };

const dirs = [".", ...(await readdir("packages")).map((name) => `packages/${name}`)];
const dryRun = process.argv.includes("--dry-run");
// provenance подписывается OIDC-токеном GitHub Actions, вне CI его нет.
const provenance = !process.argv.includes("--no-provenance");

for (const dir of dirs) {
  const file = Bun.file(`${dir}/package.json`);
  if (!(await file.exists())) continue;
  const manifest = (await file.json()) as Manifest;
  if (manifest.private) continue;

  const spec = `${manifest.name}@${manifest.version}`;
  const published = await $`npm view ${spec} version`.quiet().nothrow();
  if (published.exitCode === 0 && published.stdout.toString().trim() === manifest.version) {
    console.log(`- ${spec} уже в реестре`);
    continue;
  }

  console.log(`+ публикую ${spec}`);
  if (dryRun) continue;
  const flags = provenance ? ["--provenance"] : [];
  await $`npm publish ${flags} --access public`.cwd(dir);
}
