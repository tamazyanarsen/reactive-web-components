---
layout: home

hero:
  name: rwc
  text: Реактивные веб-компоненты на сигналах
  tagline: Типизированные фабрики тегов вместо шаблонов. Эффекты живут и умирают вместе с компонентом. Стандартные custom elements, которые работают в любом фреймворке.
  actions:
    - theme: brand
      text: Начать
      link: /ru/guide
    - theme: alt
      text: UI-кит
      link: /packages/ui
    - theme: alt
      text: GitHub
      link: https://github.com/tamazyanarsen/reactive-web-components

features:
  - title: Разметка — это TypeScript
    details: div, button, input — типизированные фабрики. Неверный пропс, событие или тип данных — ошибка компиляции, а переименование и переход к определению работают штатно.
  - title: Точечные сигналы
    details: Сигнал обновляет ровно тот текстовый узел или атрибут, который его читает. Ленивые computed без промежуточных состояний и списки, которые двигают только изменившееся.
  - title: Настоящие custom elements
    details: Пропсы — это DOM-свойства и атрибуты, события — DOM-события. Компоненты работают в React, Vue, Angular, Svelte и в обычном HTML.
  - title: Всё нужное рядом
    details: Роутер, формы, UI-кит с темами, серверный рендер с Declarative Shadow DOM и плагин для Custom Elements Manifest.
  - title: Версии UI-кита рядом
    details: Тег выбирается при регистрации, разметка вызывает фабрики. Микрофронтенды обновляют общий кит по одному, две версии живут на одной странице.
    link: /ru/microfrontends
    linkText: Как это устроено
  - title: На уровне Lit
    details: "1,23× от vanilla JS в js-framework-benchmark (среднее CPU, локальный прогон), рядом с Lit (1,24): быстрее на обновлениях, медленнее на создании больших списков. Быстрее React и Angular, при 5,1 КБ gzip."
    link: https://github.com/tamazyanarsen/reactive-web-components/blob/main/bench/js-framework-benchmark/README.md#local-results
    linkText: Результаты бенчмарка
---

## Попробуйте

<Demo name="counter" />

```ts
import { button, defineComponent, div, p, payload, signal, span, useCustomComponent } from "@rwcjs/core";

class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  events: { change: payload<number>() },
}) {
  render() {
    const { value, step } = this.props;
    const shift = (direction: number) => {
      value.update((n) => n + direction * step());
      this.events.change(value.peek());
    };
    return [button({ "@click": () => shift(-1) }, "−"), span(value), button({ "@click": () => shift(1) }, "+")];
  }
}

export const counter = useCustomComponent(Counter, "x-counter");

// Демо выше: сигнал родителя привязан к пропсу и обновляется из события.
const total = signal(3);
div(
  counter({ ".value": total, "@change": (event) => total.set(event.detail) }),
  p(() => `Twice the value: ${total() * 2}`),
);
```

## Новый проект

```bash
npm create @rwcjs@latest my-app
```
