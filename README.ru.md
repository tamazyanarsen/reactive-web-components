# rwc

[English](./README.md) · [Гайд](./docs/ru/guide.md) · [Справочник API](./docs/ru/api.md) · [Рецепты](./docs/ru/recipes.md) · [Фреймворки](./docs/ru/frameworks.md) · [SSR](./docs/ru/ssr.md) · [Экосистема](./docs/ru/ecosystem.md)

Реактивные веб-компоненты на сигналах. Разметка собирается фабриками тегов — без
шаблонных строк и без JSX, поэтому весь UI проверяется компилятором TypeScript.
Эффекты принадлежат компоненту и умирают вместе с ним.

```bash
npm install @rwcjs/core
# или новый проект: приложение с роутером и формами либо библиотека компонентов
npm create @rwcjs@latest my-app
```

## Как выглядит

```ts
import { button, cls, css, defineComponent, div, payload, span, useCustomComponent } from "@rwcjs/core";

class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  events: { change: payload<number>() },
  styles: css`
    :host { display: inline-flex; gap: 8px }
    .value { min-width: 3ch; text-align: center }
  `,
}) {
  render() {
    const { value, step } = this.props;

    const shift = (direction: number) => {
      value.update((current) => current + direction * step());
      this.events.change(value.peek());
    };

    return div(
      cls`counter`,
      button({ "@click": () => shift(-1) }, "−"),
      // Функция в детях — реактивный текст: перерисуется только этот узел.
      span(cls`value`, value),
      button({ "@click": () => shift(1) }, "+"),
    );
  }
}

export const counter = useCustomComponent(Counter, "x-counter");

// Где-то в разметке:
counter({ ".value": 5, ".step": 2, "@change": (event) => console.log(event.detail) });
```

## Что внутри

**Сигналы.** `signal`, `effect`, `computed`, `derived`, `batch`, `untracked`,
`onCleanup`, `onDispose`. Обновление синхронное: сразу после `set` разметка уже
актуальна. `computed` ленивый и без промежуточных состояний: пересчитывается при
чтении и только когда источник действительно изменился, равный результат никого
не будит, а эффекты не видят несогласованных значений. Владелец ему не нужен —
его можно держать в модуле или сторе. Вложенные эффекты разрешены — вложенный
живёт ровно столько, сколько прогон, который его создал.

**Разметка без шаблонов.** `div`, `button`, `input`, ... — фабрики с типизированным
конфигом: `.свойства`, `@события`, `class`, `attrs`, `style`, `show`. Имена
свойств, события и их payload проверяются компилятором.

**Управление потоком.** `when` — условный рендер, `each` — списки с
переиспользованием узлов по ключу, `dynamic` — полностью реактивный участок,
`show` — переключение видимости без разрушения DOM. Ни один из блоков не
оборачивает содержимое в лишний элемент. Перестановка идёт через `moveBefore()`,
где он есть.

**Компоненты.** `defineComponent({ props, events, slots, shadow, styles })` выводит
типы пропсов, событий и слотов. Стили разбираются один раз и раздаются экземплярам
общим `CSSStyleSheet`. Атрибуты разбираются по типу пропса (`<x-switch disabled>`
— это `true`), `reflect` зеркалит пропсы обратно в атрибуты для
`:host([disabled])`, а `form: true` делает компонент участником форм с
`FormData`, валидацией и сбросом. Перемещение компонента по DOM его не
перерисовывает: фокус, введённый текст и скролл сохраняются.

**Контекст.** `createContext` + `provide`/`inject`: значение находится вверх по
дереву через границы shadow и приходит сигналом.

**Асинхронность.** `resource` даёт `data`, `loading`, `error`, `refetch`,
перезапрашивает при изменении зависимостей и отменяет устаревший запрос.

**Версионирование.** `configCustomComponent` разделяет объявление и регистрацию —
несколько версий UI-кита уживаются на одной странице, а вызовы фабрики не меняются.

## Почему фабрики, а не шаблоны

Шаблонная строка — это текст: опечатка в имени атрибута, неверный тип обработчика
или пропавший проп находятся в рантайме. Здесь разметка — обычный TypeScript:

```ts
input({ ".valu": "x" });                 // ошибка компиляции: нет такого свойства
input({ "@input": (e) => e.data });      // e — InputEvent, не Event
counter({ "@change": (e) => e.detail });  // detail — number, из объявления компонента
```

Побочный эффект — не нужен ни компилятор шаблонов, ни плагин к редактору:
переход к определению, переименование и поиск ссылок работают штатными средствами.

## Разработка

```bash
bun install
bun run dev            # playground.ts — стенд по возможностям библиотеки
bun run dev:examples   # examples/ — галерея готовых компонентов
bun test
bun run typecheck
bun run build          # типы, тесты, dist
bun run verify:package # проверка собранного пакета глазами потребителя
bun run size           # бюджет размера библиотеки в бандле
```

Проверки CI и порядок релиза описаны в [CONTRIBUTING.md](./CONTRIBUTING.md).

Галерея `examples/` — законченные компоненты; каждый файл содержит и сам компонент,
и демонстрацию для страницы:

| Файл | Компонент | На чём сделан акцент |
| --- | --- | --- |
| `examples/counter.ts` | `<x-counter>` | пропсы, события, стили компонента, границы через `computed` |
| `examples/toggle-switch.ts` | `<x-switch>` | булев проп, `aria-checked`, тема через `provide`/`inject` |
| `examples/stopwatch.ts` | `<x-stopwatch>` | таймер в эффекте, `onCleanup`, `batch`, `peek`, `each` по ключу |
| `examples/rating.ts` | `<x-rating>` | `each` поверх производного списка, состояние компонента |
| `examples/search.ts` | `<x-search>` | `resource`: дебаунс внутри fetcher, отмена устаревшего ответа |
| `examples/tabs.ts` | `<x-tabs>` | слот с типизированным контекстом, `dynamic`, нативный слот |
| `examples/function-components.ts` | — | `createComponent`, `show`, композиция без теневого корня |

## Требования

Современный браузер: custom elements, shadow DOM, `adoptedStyleSheets`
(Chrome 73+, Firefox 101+, Safari 16.4+). Для `adoptedStyleSheets` есть запасной
путь через `<style>`, остальное обязательно.

Пакет поставляется как ESM с самодостаточным `dist/index.d.ts`.

## Лицензия

[MIT](./LICENSE)
