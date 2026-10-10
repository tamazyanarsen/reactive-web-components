# rwc

[Русский](./README.ru.md) · [Guide](./docs/en/guide.md) · [API reference](./docs/en/api.md) · [Recipes](./docs/en/recipes.md) · [Frameworks](./docs/en/frameworks.md) · [SSR](./docs/en/ssr.md) · [Ecosystem](./docs/en/ecosystem.md)

Reactive web components built on signals. Markup is assembled by tag factories —
no template strings, no JSX — so the whole UI is checked by the TypeScript
compiler. Effects belong to a component and die together with it.

```bash
npm install @rwcjs/core
# or start a new project: an app with router and forms, or a component library
npm create @rwcjs@latest my-app
```

## What it looks like

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
      // A function among children is reactive text: only this node re-renders.
      span(cls`value`, value),
      button({ "@click": () => shift(1) }, "+"),
    );
  }
}

export const counter = useCustomComponent(Counter, "x-counter");

// Somewhere in your markup:
counter({ ".value": 5, ".step": 2, "@change": (event) => console.log(event.detail) });
```

## What's inside

**Signals.** `signal`, `effect`, `computed`, `derived`, `batch`, `untracked`,
`onCleanup`, `onDispose`. Updates are synchronous: right after `set` the markup
is already current. `computed` is lazy and glitch-free: it recomputes on read and
only when a source really changed, an equal result wakes nobody, and effects never
see an intermediate state. It needs no owner, so it can live in a module or a store.
Nested effects are allowed — a nested effect lives exactly as long as the run that
created it.

**Markup without templates.** `div`, `button`, `input`, ... — factories with a
typed config: `.properties`, `@events`, `class`, `attrs`, `style`, `show`.
Property names, events and their payloads are checked at compile time.

**Flow control.** `when` for conditional rendering, `each` for keyed lists that
reuse nodes, `dynamic` for a fully reactive region, `show` to toggle visibility
without tearing down the DOM. None of them wrap content in an extra element.
Reordering uses `moveBefore()` where available.

**Components.** `defineComponent({ props, events, slots, shadow, styles })`
infers the types of props, events and slots. Styles are parsed once and shared
between instances through a single `CSSStyleSheet`. Attributes are parsed by the
prop's type (`<x-switch disabled>` is `true`), `reflect` mirrors props back to
attributes for `:host([disabled])`, and `form: true` makes a form-associated
component with `FormData`, validation and reset. Moving a component around the
DOM does not re-render it: focus, input text and scroll survive.

**Context.** `createContext` plus `provide`/`inject`: the value is found by
walking up the tree across shadow boundaries and arrives as a signal.

**Async.** `resource` gives you `data`, `loading`, `error`, `refetch`, refetches
when dependencies change and cancels the stale request.

**Versioning.** `configCustomComponent` separates declaration from registration —
several versions of a UI kit coexist on one page while factory calls stay the same.

## Why factories instead of templates

A template string is text: a typo in an attribute name, a wrong handler type or a
missing prop only shows up at runtime. Here markup is ordinary TypeScript:

```ts
input({ ".valu": "x" });                  // compile error: no such property
input({ "@input": (e) => e.data });        // e is InputEvent, not Event
counter({ "@change": (e) => e.detail });   // detail is number, from the declaration
```

A side benefit: no template compiler and no editor plugin are needed. Go to
definition, rename and find references work with the standard tooling.

## Development

```bash
bun install
bun run dev            # playground.ts — a stand covering the library's features
bun run dev:examples   # examples/ — a gallery of finished components
bun test
bun run typecheck
bun run build          # types, tests, dist
bun run verify:package # checks the built package the way a consumer sees it
bun run size           # size budget of the bundled library
```

CI checks and the release process are described in [CONTRIBUTING.md](./CONTRIBUTING.md)
(in Russian).

The `examples/` gallery holds finished components; each file contains both the
component itself and its demo for the page:

| File | Component | Focus |
| --- | --- | --- |
| `examples/counter.ts` | `<x-counter>` | props, events, component styles, bounds via `computed` |
| `examples/toggle-switch.ts` | `<x-switch>` | boolean prop, `aria-checked`, theming via `provide`/`inject` |
| `examples/stopwatch.ts` | `<x-stopwatch>` | timer in an effect, `onCleanup`, `batch`, `peek`, keyed `each` |
| `examples/rating.ts` | `<x-rating>` | `each` over a derived list, component-local state |
| `examples/search.ts` | `<x-search>` | `resource`: debounce inside the fetcher, cancelling a stale response |
| `examples/tabs.ts` | `<x-tabs>` | slot with a typed context, `dynamic`, native slot |
| `examples/function-components.ts` | — | `createComponent`, `show`, composition without a shadow root |

## Requirements

A modern browser: custom elements, shadow DOM, `adoptedStyleSheets`
(Chrome 73+, Firefox 101+, Safari 16.4+). `adoptedStyleSheets` has a fallback via
`<style>`; the rest is required.

The package ships as ESM with a self-contained `dist/index.d.ts`.

## License

[MIT](./LICENSE)
