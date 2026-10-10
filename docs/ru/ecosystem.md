# Экосистема и инструменты

[English](../en/ecosystem.md) · [Гайд](./guide.md) · [Справочник API](./api.md) · [Фреймворки](./frameworks.md) · [SSR](./ssr.md)

Репозиторий — монорепозиторий: `@rwcjs/core` лежит в корне, сопутствующие пакеты —
в `packages/*` (bun workspaces).

| Пакет | Что делает |
| --- | --- |
| [`@rwcjs/core`](../../README.ru.md) | Сигналы, фабрики тегов, компоненты, SSR |
| [`@rwcjs/ui`](../../packages/ui/README.md) | UI-кит: 22 доступных компонента (26 тегов) (формы, оверлеи, структура, обратная связь) с темами на CSS-переменных |
| [`@rwcjs/cem-plugin`](../../packages/cem-plugin/README.md) | Описывает компоненты rwc в Custom Elements Manifest |
| [`@rwcjs/router`](../../packages/router/README.md) | Роутер на сигналах: типизированные параметры из строки пути, страница переживает смену параметров |
| [`@rwcjs/forms`](../../packages/forms/README.md) | Формы на сигналах: типизированные поля, проверки, связывание с инпутами, состояние отправки |
| [`@rwcjs/create`](../../packages/create/README.md) | Генератор проектов: `npm create @rwcjs@latest` с шаблоном приложения или библиотеки компонентов |

## Custom Elements Manifest

[Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) — JSON-файл
с описанием custom elements пакета: теги, атрибуты, свойства, события. Его читают
редакторы, Storybook и генераторы обёрток для React, Vue и Angular.

Стандартный анализатор не понимает `defineComponent` и не знает, какой тег назначает
`useCustomComponent`. Этот пробел закрывает `@rwcjs/cem-plugin`:

```bash
npm install -D @custom-elements-manifest/analyzer @rwcjs/cem-plugin
```

```js
// custom-elements-manifest.config.js
import { rwcPlugin } from "@rwcjs/cem-plugin";

export default {
  globs: ["src/**/*.ts"],
  plugins: [rwcPlugin()],
};
```

```bash
npx custom-elements-manifest analyze
```

Из такого объявления:

```ts
export class Button extends defineComponent({
  props: {
    /** Внешний вид. */
    variant: "secondary" as Variant,
    disabled: false,
  },
  events: { press: payload<MouseEvent>() },
  reflect: ["variant", "disabled"],
}) { /* ... */ }

export const uiButton = useCustomComponent(Button, "ui-button");
```

в манифест попадут тег `ui-button`, атрибуты `variant` (тип `Variant`, по умолчанию
`"secondary"`, с описанием из JSDoc) и `disabled`, соответствующие поля с пометкой
`reflects: true` и событие `press` с типом `CustomEvent<MouseEvent>`.

Публикуйте манифест вместе с пакетом и укажите его в `package.json`:

```json
{ "customElements": "custom-elements.json" }
```

В этом репозитории `bun run cem` строит манифест для галереи `examples/`, так что CI
проверяет плагин на настоящих компонентах.

## Бенчмарк

В `bench/js-framework-benchmark` лежит keyed-реализация для
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) —
стандартного сравнения UI-библиотек на создании, обновлении, перестановке и удалении
строк таблицы. Заодно это компактный пример быстрого списка:

- подпись каждой строки — отдельный сигнал, поэтому «обновить каждую 10-ю» меняет
  100 текстовых узлов и не сравнивает список;
- `each` с ключами двигает только строки, которые поменялись местами;
- `createSelector` при выборе строки будит две строки вместо тысячи.

Как запустить его рядом с другими фреймворками, описано в
[bench/js-framework-benchmark/README.md](../../bench/js-framework-benchmark/README.md).

## Бюджет размера

`bun run size` собирает библиотеку так, как это сделает бандлер потребителя
(с минификацией), и сверяет размер после gzip и brotli с бюджетом в
`scripts/check-size.ts`. Превышение бюджета роняет CI. Если рост осознанный, поднимите
бюджет в том же коммите.
