# Using rwc components in other frameworks

[Русский](../ru/frameworks.md) · [Guide](./guide.md) · [API reference](./api.md) · [Recipes](./recipes.md)

An rwc component is a regular custom element. Any framework that renders DOM can
use it: register the component once, then write its tag in markup.

Three things make that work:

- **Props are DOM properties.** `defineComponent` puts an accessor on the element for
  every prop: `el.value = 5` writes to the prop signal, `el.value` reads it. Frameworks
  that set properties (React 19, Vue, Angular, Svelte) pass objects and arrays as is,
  without serialization. A value assigned before the component was registered is picked
  up on upgrade. Names that `HTMLElement` already owns (`title`, `hidden`, `id`, ...)
  stay native and are not overridden.
- **Props are attributes too.** Attributes are parsed by the prop type: `disabled` on a
  boolean prop means `true`, `count="3"` on a number prop is `3`, and a string prop gets
  the raw string. That covers plain HTML and server templates.
- **Events are DOM events.** `events: { valueChange: payload<number>() }` dispatches a
  `CustomEvent` named `value-change` that bubbles and crosses shadow boundaries. The
  payload is in `event.detail`.

The examples below use this component:

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

Importing the module registers the tag. That import is all the setup a framework needs.

## React 19

React 19 supports custom elements natively. A prop that exists on the element is set as
a property, and an `on` prop subscribes to the event with the name that follows `on`:

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

For JSX type checking, declare the tag once:

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

With React 18 and earlier, everything arrives as attributes, and events have to be
subscribed through a `ref`. Use a wrapper such as `@lit/react`'s `createComponent`, or
generate wrappers from the manifest (see below).

## Vue 3

Tell the compiler which tags are custom elements, so it does not try to resolve them as
Vue components:

```ts
// vite.config.ts
vue({
  template: {
    compilerOptions: { isCustomElement: (tag) => tag.startsWith("x-") },
  },
});
```

Vue sets a value as a property when the element has one, so objects pass through
without serialization. Events go through `@`:

```vue
<script setup lang="ts">
import "./ui/counter";
const count = ref(1);
</script>

<template>
  <x-counter :value="count" :step="2" @value-change="count = $event.detail" />
</template>
```

Add `.prop` (`:value.prop="count"`) if you want a property even where Vue would choose
an attribute.

## Angular

Allow unknown elements in the component that uses the tag, then use ordinary property
and event bindings:

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

Svelte sets properties when they exist on the element, and `on` attributes subscribe to
events with the matching name:

```svelte
<script lang="ts">
  import "./ui/counter";
  let count = $state(1);
</script>

<x-counter value={count} step={2} onvalue-change={(e) => (count = e.detail)} />
```

## Plain HTML

```html
<script type="module" src="/ui/counter.js"></script>

<x-counter value="3" step="2"></x-counter>
<script>
  document.querySelector("x-counter").addEventListener("value-change", (event) => {
    console.log(event.detail);
  });
</script>
```

## Types and tooling from the manifest

[`@rwcjs/cem-plugin`](../../packages/cem-plugin/README.md) describes rwc components in
a Custom Elements Manifest. From the manifest you get:

- tag, attribute and event autocompletion in VS Code and JetBrains IDEs;
- generated wrappers and JSX types for React, Vue, Svelte and Solid
  (for example the `custom-element-*-integration` packages from the
  `custom-elements-manifest` ecosystem);
- Storybook docs tables.

## Notes

- **Theming crosses frameworks.** `provide`/`inject` walks up the DOM, so an rwc
  provider placed anywhere above, including inside a React tree, works for rwc
  consumers below.
- **Moves keep state.** When a framework reorders a list of rwc elements, the components
  are not re-rendered: teardown is postponed to a microtask and cancelled if the element
  is reinserted.
- **Shadow DOM and global CSS.** Styles from the page do not reach into a component.
  Style the host from outside, use CSS custom properties, or reflect props to attributes
  (`reflect: ["variant"]`) and target `:host([variant="primary"])` inside.
