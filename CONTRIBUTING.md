# Разработка и релизы

## Окружение

```bash
bun install
bun run dev            # playground.ts — стенд с возможностями библиотеки
bun run dev:examples   # examples/ — галерея готовых компонентов
bun test               # все тесты, включая packages/*
bun run typecheck
```

## Перед коммитом

CI (`.github/workflows/ci.yml`) на каждый push и PR выполняет то же, что и:

```bash
bun run build            # typecheck + тесты + dist
bun run verify:package   # собранный пакет глазами потребителя
bun run size             # бюджет размера, см. scripts/check-size.ts
bun run cem              # манифест examples/ — проверка @rwcjs/cem-plugin
```

Пользовательские изменения записываются в `CHANGELOG.md`. Новые возможности
документируются на двух языках: `docs/en` и `docs/ru` говорят одно и то же.

## Сайт документации

Сайт на VitePress лежит в `site/` и собирается из того же markdown, что читается на
GitHub: `docs/en`, `docs/ru` и README пакетов. Скрипт `site/scripts/prepare-content.ts`
раскладывает их в `site/content` и переписывает ссылки; главные страницы — в `site/pages`.
Живые примеры — модули `site/demos/*.ts`, на странице: `<Demo name="counter" />`.

```bash
cd site
bun install
bun run dev       # http://localhost:5173/reactive-web-components/
```

Деплой на GitHub Pages — `.github/workflows/docs.yml`, на каждый push в `main`,
затрагивающий документацию или код.

## Релиз

Публикуются пакеты, чьей версии ещё нет в npm: корневой `@rwcjs/core` и всё из
`packages/*`. Остальные пропускаются, поэтому повторный запуск безопасен.

1. Поднимите `version` в `package.json` нужных пакетов и допишите `CHANGELOG.md`.
2. Закоммитьте и отправьте в `main`.
3. Опубликуйте одним из способов:
   - **через GitHub Actions** (рекомендуется): Actions → Release → Run workflow.
     Нужен секрет репозитория `NPM_TOKEN` (automation-токен npm). Пакеты получают
     [provenance](https://docs.npmjs.com/generating-provenance-statements) — реестр
     показывает, из какого коммита они собраны;
   - **локально**: `npm login`, затем `bun run build && bun run verify:package` и
     `bun run scripts/publish-changed.ts --no-provenance`. Проверить, что уйдёт в реестр,
     можно флагом `--dry-run`.
4. Поставьте тег: `git tag v<версия> && git push --tags`.
