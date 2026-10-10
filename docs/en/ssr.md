# Server rendering

[Русский](../ru/ssr.md) · [Guide](./guide.md) · [API reference](./api.md) · [Frameworks](./frameworks.md)

`renderToString` turns markup and components into HTML that the browser shows before
any JavaScript loads. Shadow roots go into the HTML as
[Declarative Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template#shadowrootmode):
`<template shadowrootmode="open">` together with the component styles. Search engines
see the content, and the first frame has no flash of unstyled custom elements.

## Rendering on the server

rwc renders on a real DOM, so the server needs a DOM implementation. Register it once
per process, **before** importing rwc and your components:

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

The output for one counter looks like this:

```html
<x-counter value="5">
  <template shadowrootmode="open">
    <style>:host { display: inline-flex; gap: 8px }</style>
    <div class="counter"><button>−</button><span class="value">5</span><button>+</button></div>
  </template>
</x-counter>
```

Effects created during rendering are destroyed before `renderToString` returns.

## What happens in the browser

1. The parser turns `<template shadowrootmode>` into a real shadow root. The component
   is visible and styled with no JavaScript.
2. The script registers `x-counter`, and the existing elements upgrade.
3. `attachShadow` returns the declarative root that is already there, and the component
   renders itself into it, now live.

This is a re-render rather than hydration: the client builds the component again and
does not reuse the server nodes. For typical components this is not noticeable, and the
library stays simple.

## Passing state to the client

On the client the component knows only what is in the HTML, which means the
**attributes**. A value passed as a property (`".value": 5`) exists only on the server.
List props the client needs in `reflect`, and they will be written into attributes:

```ts
class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  reflect: ["value", "step"],
}) { /* ... */ }
```

Attributes are parsed by the prop type on the client: `value="5"` becomes the number `5`,
and `disabled` on a boolean prop becomes `true`. Objects and arrays survive as JSON, but
big data is better passed separately, for example as a `<script type="application/json">`
read by the page.

## Options

```ts
renderToString(build, { comments: true });
```

`comments` keeps the anchor comments of `when`, `each` and `dynamic`. They are dropped
by default: the client re-renders anyway, and anchors only make the HTML bigger.

## Limitations

- The server DOM must support custom elements and shadow DOM (happy-dom does).
- Closed shadow roots of rwc components are serialized too, while closed roots of
  third-party elements are not reachable.
- Form state stored in properties is serialized for `input` (`value`, `checked`),
  `textarea` and `option` (`selected`). Other property-only state is not.
- Browsers without Declarative Shadow DOM (Firefox before 123, Safari before 16.4) show
  the light DOM until the script loads.
