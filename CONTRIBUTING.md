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
   - **через GitHub Actions** (рекомендуется): Actions → Release → Run workflow или
     `gh workflow run release.yml`. Токенов и секретов нет: npm доверяет workflow через
     [Trusted Publishing](https://docs.npmjs.com/trusted-publishers). У каждого пакета на
     npmjs.com в Settings → Trusted Publisher указаны GitHub Actions, репозиторий
     `tamazyanarsen/reactive-web-components` и файл `release.yml`. Пакеты получают
     [provenance](https://docs.npmjs.com/generating-provenance-statements) — реестр
     показывает, из какого коммита они собраны;
   - **локально**: `bun run build && bun run verify:package`, проверить список через
     `bun run scripts/publish-changed.ts --dry-run`, затем в каталоге каждого пакета из
     списка `npm publish --access public`. На аккаунте 2FA: npm откроет браузер для
     подтверждения, поэтому скрипт публикации локально не подходит — он не интерактивный.
4. Поставьте тег: `git tag v<версия> && git push --tags` для ядра,
   `<пакет>-v<версия>` (например, `ui-v0.1.1`) для остальных.

Новый пакет публикуется первый раз локально: Trusted Publisher настраивается только для
пакета, который уже есть в реестре.

## Версии пакетов

- Ядро и пакеты из `packages/*` версионируются независимо, пока пакеты ниже 1.0.
  Совместимость с ядром выражается диапазоном в `peerDependencies`, а не номером версии.
- Изменили `peerDependencies` или выпустили новую линию пакета — обновите таблицу
  «Версии пакетов» в `docs/en/ecosystem.md` и `docs/ru/ecosystem.md`. Тест
  `test/docs.test.ts` сверяет её с `package.json` и упадёт, если забыть.
- Когда `ui`, `router` и `forms` стабилизируются, они выходят сразу на мажор ядра вместе
  с его следующим мажорным релизом (например, все на 4.0). С этого момента мажор общий
  для всех пакетов и меняется одновременно, даже если в каком-то пакете ничего не
  сломалось. Минорные и патч-версии каждый пакет поднимает сам.
- Шаблоны `packages/create/templates/*` ставят совместимый набор: при новой линии пакета
  поднимите диапазоны и там.
