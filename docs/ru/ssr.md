# Серверный рендер

[English](../en/ssr.md) · [Гайд](./guide.md) · [Справочник API](./api.md) · [Фреймворки](./frameworks.md)

`renderToString` превращает разметку и компоненты в HTML, который браузер показывает
ещё до загрузки JavaScript. Теневые корни попадают в HTML как
[Declarative Shadow DOM](https://developer.mozilla.org/ru/docs/Web/HTML/Element/template#shadowrootmode):
`<template shadowrootmode="open">` вместе со стилями компонента. Поисковики видят
содержимое, а на первом кадре custom elements не мигают без стилей.

## Рендер на сервере

rwc рендерит на настоящем DOM, поэтому серверу нужна его реализация. Зарегистрируйте её
один раз на процесс, **до** импорта rwc и компонентов:

```ts
// server/render.ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

const { renderToString } = await import("@rwcjs/core");
const { counter } = await import("../ui/counter");

export const renderPage = (initial: number) => `<!doctype html>
<html>
  <body>
    ${renderToString(() => counter({ ".value": initial }))}
    <script type="module" src="/ui/counter.js"></script>
  </body>
</html>`;
```

Для одного счётчика получится такой HTML:

```html
<x-counter value="5">
  <template shadowrootmode="open">
    <style>:host { display: inline-flex; gap: 8px }</style>
    <div class="counter"><button>−</button><span class="value">5</span><button>+</button></div>
  </template>
</x-counter>
```

Эффекты, созданные во время рендера, уничтожаются до возврата из `renderToString`.

## Что происходит в браузере

1. Парсер превращает `<template shadowrootmode>` в настоящий теневой корень. Компонент
   виден и стилизован без всякого JavaScript.
2. Скрипт регистрирует `x-counter`, и существующие элементы обновляются (upgrade).
3. `attachShadow` возвращает уже готовый декларативный корень, и компонент рендерит себя
   в него заново, теперь уже живым.

Это ререндер, а не гидрация: клиент строит компонент заново и не переиспользует
серверные узлы. Для типичных компонентов разницы не видно, а библиотека остаётся простой.

## Как передать состояние клиенту

На клиенте компонент знает только то, что есть в HTML, то есть **атрибуты**. Значение,
переданное свойством (`".value": 5`), существует только на сервере. Пропсы, которые
нужны клиенту, перечислите в `reflect`, и они попадут в атрибуты:

```ts
class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  reflect: ["value", "step"],
}) { /* ... */ }
```

На клиенте атрибуты разбираются по типу пропса: `value="5"` станет числом `5`, а
`disabled` у булева пропса — `true`. Объекты и массивы переживут путь как JSON, но
большие данные лучше передавать отдельно, например в `<script type="application/json">`,
который прочитает страница.

## Опции

```ts
renderToString(build, { comments: true });
```

`comments` оставляет комментарии-якоря блоков `when`, `each` и `dynamic`. По умолчанию
они выбрасываются: клиент всё равно перерисует компоненты, а якоря только раздувают HTML.

## Ограничения

- Серверный DOM должен поддерживать custom elements и shadow DOM (happy-dom умеет).
- Закрытые теневые корни компонентов rwc тоже сериализуются, а закрытые корни сторонних
  элементов недоступны.
- Состояние форм, которое живёт в свойствах, сериализуется для `input` (`value`,
  `checked`), `textarea` и `option` (`selected`). Остальное состояние из свойств — нет.
- Браузеры без Declarative Shadow DOM (Firefox до 123, Safari до 16.4) до загрузки
  скрипта покажут только светлый DOM.
