# Компоненты rwc в других фреймворках

[English](../en/frameworks.md) · [Гайд](./guide.md) · [Справочник API](./api.md) · [Рецепты](./recipes.md)

Компонент rwc — обычный custom element. Его может использовать любой фреймворк,
который рендерит DOM: компонент регистрируется один раз, дальше в разметке пишется тег.

Работает это благодаря трём вещам:

- **Пропсы — это DOM-свойства.** `defineComponent` вешает на элемент аксессор для
  каждого пропса: `el.value = 5` пишет в сигнал пропса, `el.value` читает его.
  Фреймворки, которые выставляют свойства (React 19, Vue, Angular, Svelte), передают
  объекты и массивы как есть, без сериализации. Значение, присвоенное до регистрации
  компонента, подхватывается при upgrade. Имена, которые уже есть у `HTMLElement`
  (`title`, `hidden`, `id`, ...), остаются нативными и не перекрываются.
- **Пропсы — это ещё и атрибуты.** Атрибут разбирается по типу пропса: `disabled` у
  булева пропса — это `true`, `count="3"` у числового — `3`, строковый пропс получает
  строку как есть. Этого хватает для обычного HTML и серверных шаблонов.
- **События — это DOM-события.** `events: { valueChange: payload<number>() }`
  отправляет `CustomEvent` с именем `value-change`, который всплывает и пересекает
  границы shadow. Данные лежат в `event.detail`.

В примерах ниже используется такой компонент:

```ts
// ui/counter.ts
import { button, defineComponent, div, payload, span, useCustomComponent } from "@rwcjs/core";

export class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  events: { valueChange: payload<number>() },
}) {
  render() {
    const { value, step } = this.props;
    const shift = (direction: number) => {
      value.update((n) => n + direction * step());
      this.events.valueChange(value.peek());
    };
    return div(
      button({ "@click": () => shift(-1) }, "−"),
      span(value),
      button({ "@click": () => shift(1) }, "+"),
    );
  }
}

export const counter = useCustomComponent(Counter, "x-counter");
```

Импорт модуля регистрирует тег. Другой настройки фреймворку не нужно.

## React 19

React 19 поддерживает custom elements сам. Пропс, который есть у элемента, выставляется
как свойство, а пропс на `on` подписывается на событие с именем, идущим после `on`:

```tsx
import "./ui/counter";

export function Cart() {
  const [count, setCount] = useState(1);
  return (
    <x-counter
      value={count}
      step={2}
      onvalue-change={(event: CustomEvent<number>) => setCount(event.detail)}
    />
  );
}
```

Чтобы JSX проверял типы, тег объявляется один раз:

```ts
// custom-elements.d.ts
import type { Counter } from "./ui/counter";

type ElementProps<T> = Partial<Pick<T, keyof T>> & React.HTMLAttributes<HTMLElement>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "x-counter": ElementProps<Pick<Counter, "value" | "step">> & {
        "onvalue-change"?: (event: CustomEvent<number>) => void;
      };
    }
  }
}
```

В React 18 и раньше всё приходит атрибутами, а на события приходится подписываться
через `ref`. Возьмите обёртку вроде `createComponent` из `@lit/react` или сгенерируйте
обёртки по манифесту (см. ниже).

## Vue 3

Скажите компилятору, какие теги — custom elements, чтобы он не пытался найти
одноимённые Vue-компоненты:

```ts
// vite.config.ts
vue({
  template: {
    compilerOptions: { isCustomElement: (tag) => tag.startsWith("x-") },
  },
});
```

Vue выставляет значение свойством, если оно есть у элемента, поэтому объекты проходят
без сериализации. События — через `@`:

```vue
<script setup lang="ts">
import "./ui/counter";
const count = ref(1);
</script>

<template>
  <x-counter :value="count" :step="2" @value-change="count = $event.detail" />
</template>
```

Модификатор `.prop` (`:value.prop="count"`) заставит выставить свойство даже там, где
Vue выбрал бы атрибут.

## Angular

Разрешите неизвестные элементы в компоненте, который использует тег, дальше работают
обычные привязки свойств и событий:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "./ui/counter";

@Component({
  selector: "app-cart",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <x-counter [value]="count" [step]="2" (value-change)="count = $any($event).detail" />
  `,
})
export class CartComponent {
  count = 1;
}
```

## Svelte 5

Svelte выставляет свойства, если они есть у элемента, а атрибуты на `on` подписываются
на событие с тем же именем:

```svelte
<script lang="ts">
  import "./ui/counter";
  let count = $state(1);
</script>

<x-counter value={count} step={2} onvalue-change={(e) => (count = e.detail)} />
```

## Обычный HTML

```html
<script type="module" src="/ui/counter.js"></script>

<x-counter value="3" step="2"></x-counter>
<script>
  document.querySelector("x-counter").addEventListener("value-change", (event) => {
    console.log(event.detail);
  });
</script>
```

## Типы и инструменты из манифеста

[`@rwcjs/cem-plugin`](../../packages/cem-plugin/README.md) описывает компоненты rwc
в Custom Elements Manifest. Из манифеста получаются:

- автодополнение тегов, атрибутов и событий в VS Code и IDE от JetBrains;
- сгенерированные обёртки и JSX-типы для React, Vue, Svelte и Solid (например, пакеты
  `custom-element-*-integration` из экосистемы `custom-elements-manifest`);
- таблицы документации в Storybook.

## Что стоит знать

- **Темизация работает поверх фреймворков.** `provide`/`inject` ищут значение вверх по
  DOM, поэтому провайдер rwc где угодно выше по дереву, хоть внутри дерева React,
  виден потребителям rwc ниже.
- **Перемещение сохраняет состояние.** Когда фреймворк переставляет список элементов
  rwc, компоненты не перерисовываются: уборка отложена на микрозадачу и отменяется,
  если элемент вставили обратно.
- **Shadow DOM и глобальный CSS.** Стили страницы внутрь компонента не проникают.
  Стилизуйте хост снаружи, используйте CSS-переменные или отражайте пропсы в атрибуты
  (`reflect: ["variant"]`) и пишите внутри `:host([variant="primary"])`.
