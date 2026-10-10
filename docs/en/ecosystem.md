# Ecosystem and tooling

[Русский](../ru/ecosystem.md) · [Guide](./guide.md) · [API reference](./api.md) · [Frameworks](./frameworks.md) · [SSR](./ssr.md)

The repository is a monorepo: `@rwcjs/core` lives at the root, and companion packages
live in `packages/*` (bun workspaces).

| Package | What it does |
| --- | --- |
| [`@rwcjs/core`](../../README.md) | Signals, tag factories, components, SSR |
| [`@rwcjs/cem-plugin`](../../packages/cem-plugin/README.md) | Describes rwc components in a Custom Elements Manifest |
| [`@rwcjs/router`](../../packages/router/README.md) | Router on signals: typed params from path strings, pages that survive param changes |
| [`@rwcjs/forms`](../../packages/forms/README.md) | Forms on signals: typed fields, validation, input binding, submit state |
| [`@rwcjs/create`](../../packages/create/README.md) | Project generator: `npm create @rwcjs@latest` with an app or a component library template |

## Custom Elements Manifest

A [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) is a JSON file
that describes a package's custom elements: tags, attributes, properties, events. Editors,
Storybook, and wrapper generators for React, Vue and Angular read it.

The stock analyzer does not understand `defineComponent` and does not know which tag
`useCustomComponent` assigns. `@rwcjs/cem-plugin` fills the gap:

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

From a declaration like this:

```ts
export class Button extends defineComponent({
  props: {
    /** Visual style. */
    variant: "secondary" as Variant,
    disabled: false,
  },
  events: { press: payload<MouseEvent>() },
  reflect: ["variant", "disabled"],
}) { /* ... */ }

export const uiButton = useCustomComponent(Button, "ui-button");
```

the manifest gets the tag `ui-button`, the attributes `variant` (type `Variant`, default
`"secondary"`, with the JSDoc description) and `disabled`, the matching fields marked
`reflects: true`, and the event `press` of type `CustomEvent<MouseEvent>`.

Publish the manifest with your package and point to it from `package.json`:

```json
{ "customElements": "custom-elements.json" }
```

This repository builds a manifest for the `examples/` gallery with `bun run cem`, so CI
checks the plugin against real components.

## Benchmark

`bench/js-framework-benchmark` holds the keyed implementation for
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), the
standard comparison of UI libraries on creating, updating, swapping and removing table
rows. It is also a compact example of a fast list:

- each row label is its own signal, so "update every 10th row" changes 100 text nodes
  and does not diff the list;
- the keyed `each` moves only the rows that changed places;
- `createSelector` makes selecting a row wake two rows instead of a thousand.

How to run it next to other frameworks is described in
[bench/js-framework-benchmark/README.md](../../bench/js-framework-benchmark/README.md).

## Size budget

`bun run size` builds the library the way a consumer's bundler would (minified) and
checks the gzip and brotli size against a budget in `scripts/check-size.ts`. CI fails
when the budget is exceeded. When growth is deliberate, raise the budget in the same
commit.
