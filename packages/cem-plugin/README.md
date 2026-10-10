# @rwcjs/cem-plugin

A [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) analyzer
plugin for [`@rwcjs/core`](../../README.md) components.

The stock analyzer sees `class Button extends defineComponent({...})` as a class with an
unknown base and does not know the tag assigned by `useCustomComponent`. The plugin reads
both and fills in the manifest:

- **attributes**: one per prop, in kebab-case, with the type and the default value;
- **fields**: the DOM properties a component exposes (`el.variant = "primary"`), with
  `reflects: true` for props listed in `reflect`;
- **events**: kebab-case names with a `CustomEvent<T>` type taken from `payload<T>()`;
- **tag name** and a `custom-element-definition` export, taken from `useCustomComponent`
  or `configCustomComponent`;
- `formAssociated: true` for components declared with `form: true`.

JSDoc comments on props and events become descriptions.

The manifest drives editor autocompletion for tags, Storybook docs, and wrapper generators
for React, Vue and Angular.

## Usage

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

Then point consumers at the result from your `package.json`:

```json
{ "customElements": "custom-elements.json" }
```

## Options

```js
rwcPlugin({
  // if you import defineComponent under a different name
  defineComponent: ["defineComponent", "define"],
  // functions that register a component under a tag
  register: ["useCustomComponent", "configCustomComponent"],
});
```

## Limitations

Types are inferred from the syntax, without the type checker: a literal gives `string`,
`number` or `boolean`, and `value: "a" as Variant` gives `Variant`. For anything else,
add an `as` annotation to the default value.
