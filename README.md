# Reactive Web Components (RWC)

[🇷🇺 Документация на русском](./docs/docs.ru.md)

**RWC** is a lightweight runtime for building reactive [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_Components) without depending on a specific framework. It combines fine-grained signals, effects, and a declarative TypeScript-first HTML factory to compose UI from strongly-typed primitives — no templates, no JSX, just TypeScript.

## Why RWC

### Framework-free signals & effects

Signals and effects in RWC are **independent primitives** — they work anywhere in your code with zero restrictions. This is a fundamental difference from existing frameworks:

| | Signals anywhere | Effects anywhere | Needs special context |
|---|:---:|:---:|:---:|
| **RWC** | ✅ | ✅ | No |
| **Angular** | ✅ | ❌ | `effect()` requires injection context (constructor, factory, `runInInjectionContext`) [1][2] |
| **Solid.js** | ✅ | ⚠️ | `createEffect` needs a reactive owner (`createRoot` / `render` / `runWithOwner`) — effects outside a root will never be disposed [3][4] |

In Angular, calling `effect()` in `ngOnInit`, in a regular method, or outside a component throws `NG0203`. The workaround is to inject an `Injector` and wrap code in `runInInjectionContext`. In Solid.js, `createEffect` outside a tracking scope (e.g. in `setTimeout`, async code, or global scope) either leaks memory or requires manual `getOwner` / `runWithOwner` plumbing.[1][5][2][6][4]

**RWC has none of these limitations.** Signals and effects are first-class citizens that work in any context — inside components, outside components, in utility functions, in async code, everywhere.[7]

### TypeScript all the way down

RWC takes a **no-HTML** approach: all markup is built through TypeScript factory functions (`div`, `button`, `input`, …). This means:[7]

- **Full type-checking in templates** — props, attributes, events, slots, and children are all typed.
- **Autocomplete everywhere** — IDE suggestions for every config option, event name, and attribute.
- **Compile-time errors** — typos in attribute names or wrong event handler signatures are caught before runtime.

### Typed slots

Slots in RWC are fully typed via `slotTemplate`. The parent component defines what templates it expects, and the child component consumes them with typed context — similar to scoped slots in Vue, but with compile-time guarantees.[7]

## Features

- **Reactivity** — `signal`, `effect`, `createSignal`, `rs`, `computed`, `pipe`, `forkJoin`, `combineLatest`.[7]
- **Class components** — decorators (`@component`, `@property`, `@event`) with lifecycle hooks.[7]
- **Functional components** — lightweight alternative via `createComponent`.[7]
- **HTML factory** — declarative element creation with typed config (`ComponentInitConfig`).[7]
- **Shorthand config** — `.attr` for attributes, `@event` for listeners, `$name` for effects.[7]
- **Control flow** — `getList` (keyed efficient lists), `when` (conditional render), `show` (CSS toggle).[7]
- **Slots** — typed `slotTemplate` with scoped context.[7]
- **DI & styling** — context via providers/injects, reactive refs, reactive `classList` and `style`.[7]

## Installation

```bash
npm install @reactive-web-components/rwc
```

> Requires TypeScript and a modern browser with [Custom Elements](https://caniuse.com/custom-elementsv1) support.

## Quick Start

A minimal reactive counter using shorthand config syntax:

```ts
import { component, property, event } from '@reactive-web-components/rwc';
import { BaseElement } from '@reactive-web-components/rwc';
import { div, button } from '@reactive-web-components/rwc';
import { signal, rs, newEventEmitter, useCustomComponent } from '@reactive-web-components/rwc';

@component('rwc-counter')
class Counter extends BaseElement {
  @property()
  count = signal(0);

  @event()
  onCountChange = newEventEmitter<number>();

  render() {
    return div(
      button(
        {
          "@click": () => {
            this.count.update((v) => v + 1);
            this.onCountChange(this.count());
          },
        },
        rs`Count: ${this.count}`, // using rs`...`
        () => `Count: ${this.count()}`, // using function with signall call
      );
    );
  }
}

export const CounterComp = useCustomComponent(Counter);
```

Usage in another component:

```ts
CounterComp({
  '.count': signal(10),                    // typed attribute via shorthand
  '@onCountChange': (v) => console.log(v), // typed event via shorthand
})
```

Or directly in HTML:

```html
<rwc-counter></rwc-counter>
```

## Config Shorthand Syntax

RWC supports a concise config notation alongside the standard one:[7]

```ts
// Shorthand — less boilerplate, same type safety
div({
  '.id': 'main',
  '.tabIndex': 0,
  '@click': (e) => console.log('clicked', e),
  '$onMount': (el) => console.log('element created', el),
}, 'Content')

// Equivalent standard config
div({
  attributes: { id: 'main', tabIndex: 0 },
  listeners: { click: (e) => console.log('clicked', e) },
  effects: [(el) => console.log('element created', el)],
}, 'Content')
```

| Prefix | Meaning | Example |
|--------|---------|---------|
| `.` | Attribute / property | `'.disabled': true` |
| `@` | Event listener (DOM or custom) | `'@click': handler` |
| `$` | Effect (runs on element creation) | `'$init': (el) => ...` |

## Typed Slot Templates

```ts
@component('item-list')
class ItemList extends BaseElement {
  public slotTemplate = defineSlotTemplate<{
    item: (ctx: { id: number; name: string }) => ComponentConfig<any>;
  }>();

  @property()
  items = signal<{ id: number; name: string }[]>([]);

  render() {
    return div(getList(
      this.items,
      (item) => item.id,
      (item) => this.slotTemplate.item?.(item) || div(item.name)
    ));
  }
}

export const ItemListComp = useCustomComponent(ItemList);

// Consumer — fully typed context in the slot
ItemListComp({ '.items': data })
  .setSlotTemplate({
    item: (ctx) => div(`${ctx.name} (#${ctx.id})`), // ctx is typed!
  })
```

## When to Use RWC

- Low-level but type-safe layer for Web Components without a heavy framework.
- Signal-based reactivity (like Solid or Angular Signals) on top of the native DOM — but without their context restrictions.[8][6]
- Shared runtime across projects — vanilla apps, microfrontends, or integration into Angular/React via wrappers.
- Compile-time safety in templates, slots, and event handlers.

## Documentation

| Resource | Description |
|----------|-------------|
| [docs.ru.md](./docs/docs.ru.md) | Full documentation in Russian — complete API reference with examples |
| [docs.en.md](./docs/docs.en.md) | Full documentation in English — complete API reference with examples |
| `src/` | Source code and usage examples |

## Project Status

The library is under active development. The core API is stable and used in production prototypes, but minor changes to typings and helper utilities may still occur.[7]

Contributions, issues, and pull requests are welcome!

## License

[MIT](./LICENSE)

---

## References

1. [Signals in Angular: Building Blocks](https://www.angulararchitects.io/blog/angular-signals/) - Several building blocks for Signals such as effect can only be used in an injection context. This is...

2. [Side effects for non-reactives APIs](https://angular.dev/guide/signals/effect) - Injection context link. By default, you can only create an effect() within an injection context (whe...

3. [runWithOwner](https://docs.solidjs.com/reference/reactive-utilities/run-with-owner) - Execute code under a specific owner in SolidJS for proper cleanup and context access, especially in ...

4. [Using signal outside of component. · solidjs solid · Discussion #397](https://github.com/solidjs/solid/discussions/397) - The basic of it is while it isn't restricted to components, Solid's reactivity is built with framewo...

5. [Effects and InjectionContext in Angular(v21) - DEV Community](https://dev.to/pckalyan/effects-and-injectioncontext-in-angularv21-20ib) - Mastering the Life of an Effect: Injection Context and Beyond To understand why an...

6. [SolidJS: "computations created outside a `createRoot` or `render` will never be disposed" messages in the console log](https://stackoverflow.com/questions/70373659/solidjs-computations-created-outside-a-createroot-or-render-will-never-be) - When working on a SolidJS project you might start seeing the following warning message in your JS co...

7. [reactive-web-components/rwc 2.51.8 on npm](https://libraries.io/npm/@reactive-web-components%2Frwc) - Modern library for creating reactive web components with declarative syntax and strict typing

8. [effect() should have an option to run outside of an injection ...](https://github.com/angular/angular/issues/56357) - Which @angular/* package(s) are relevant/related to the feature request? core Description Angular's ...
