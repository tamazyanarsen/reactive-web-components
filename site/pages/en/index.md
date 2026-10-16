---
layout: home

hero:
  name: rwc
  text: Reactive web components on signals
  tagline: Typed tag factories instead of templates. Effects that live and die with the component. Standard custom elements that work in any framework.
  actions:
    - theme: brand
      text: Get started
      link: /guide
    - theme: alt
      text: UI kit
      link: /packages/ui
    - theme: alt
      text: GitHub
      link: https://github.com/tamazyanarsen/reactive-web-components

features:
  - title: Markup is TypeScript
    details: div, button, input are typed factories. A wrong prop, event or payload type is a compile error, and rename and go-to-definition just work.
  - title: Fine-grained signals
    details: A signal updates the exact text node or attribute that reads it. Lazy, glitch-free computed values and keyed lists that move only what changed.
  - title: Real custom elements
    details: Props are DOM properties and attributes, events are DOM events. Use the components from React, Vue, Angular, Svelte or plain HTML.
  - title: Batteries included
    details: Router, forms, a themable UI kit, server rendering with Declarative Shadow DOM, and a Custom Elements Manifest plugin.
  - title: UI kit versions side by side
    details: Tags are chosen at registration, markup calls factories. Microfrontends upgrade the shared kit one at a time, with two versions on one page.
    link: /microfrontends
    linkText: How it works
  - title: On par with Lit
    details: 1.23× vanilla JS in js-framework-benchmark, next to Lit's 1.24 and ahead of React and Angular, at 5.1 KB gzip.
    link: https://github.com/tamazyanarsen/reactive-web-components/blob/main/bench/js-framework-benchmark/README.md#local-results
    linkText: Benchmark results
---

## Try it

<Demo name="counter" />

```ts
import { button, defineComponent, payload, span, useCustomComponent } from "@rwcjs/core";

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
```

## Start a project

```bash
npm create @rwcjs@latest my-app
```
