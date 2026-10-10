# API reference

[Русский](../ru/api.md) · [Guide](./guide.md) · [Recipes](./recipes.md) · [Frameworks](./frameworks.md) · [SSR](./ssr.md)

Everything is imported from the package root:

```ts
import { signal, effect, div, defineComponent } from "@rwcjs/core";
```

- [Signals](#signals)
- [Effects](#effects)
- [Derived values](#derived-values)
- [Tag factories](#tag-factories)
- [Element config](#element-config)
- [Classes](#classes)
- [Flow control](#flow-control)
- [Components](#components)
- [Styles](#styles)
- [Context](#context)
- [Async](#async)
- [Effect ownership](#effect-ownership)
- [Types](#types)

## Signals

### `signal(initValue, options?)`

Creates a writable source.

```ts
const count = signal(0);
const items = signal<string[]>([], { equals: false });
```

| Member | Signature | Description |
| --- | --- | --- |
| call | `(): T` | the value; subscribes when called inside an effect |
| `set` | `(value: T): void` | write; an equal value does not wake subscribers |
| `update` | `(fn: (prev: T) => T): void` | write based on the previous value, read without subscribing |
| `peek` | `(): T` | the value without subscribing |

`options.equals` compares the old and the new value. Defaults to `Object.is`.
`false` disables comparison: subscribers wake on every write.

### `batch(fn)`

Groups writes: subscribers run once on exit. Returns the result of `fn`. Nested
`batch` calls are drained when the outermost one exits. A `computed` read inside
`batch` is already up to date: it recomputes on read.

### `untracked(fn)`

Runs `fn` without subscribing to what it reads and without passing ownership to
effects created inside. Returns the result of `fn`.

### `isSignal(value)`

Checks the reactive-source brand. `true` for `signal`, `computed`, `derived`,
`rs`, `combine`; `false` for a plain function.

## Effects

### `effect(fn): EffectCb`

Runs `fn` immediately and on every change of what it read. Returns a handle with
a `destroy()` method.

An effect created during another effect's run becomes its child: it is destroyed
before the parent restarts and together with the parent. An effect created in a
component's `render()` (or inside `createRoot`, `when`, `each`) belongs to that
component or scope and is destroyed with it.

### `onCleanup(fn)`

Registers cleanup before the current effect's next run and on its destruction.
Outside an effect it does nothing.

### `onDispose(fn)`

Registers cleanup for destruction only. Works on the first run only; a later call
logs a warning.

### `createSelector(source, equals?)`

Returns `isSelected(key)`, an O(1) check of whether `key` matches `source()`. Every key
gets its own source, so when the selection changes, only the effects that read the old
and the new key wake up, not every reader:

```ts
const isSelected = createSelector(selectedId);
each(rows, (row) => tr({ class: { active: () => isSelected(row.peek().id) } }, ...));
```

`equals(key, value)` defaults to `Object.is`. A key's source lives while someone reads it.

## Derived values

### `computed(fn, options?)`

A lazy memoised derived value. It computes on read, caches the result and
recomputes only when its sources have actually changed. A recomputation that
yields an equal value (`Object.is` or `options.equals`) does not wake observers.
Effects never see an inconsistent intermediate state: in the diamond
`a → (b, c) → d` the effect on `d` sees `b` and `c` in agreement.

`computed` subscribes to its sources only while some effect reads it, so it
needs no owner and does not leak: declare it anywhere — in `render()`, at
module level, in a store.

### `derived(fn)`

A derived value with no memoisation and no effect: `fn` runs on every read.
Cheaper than `computed` for short expressions and requires no teardown.

### `createComputed(compute, options?)`

The low-level constructor behind `computed`; application code uses `computed`.
The second argument used to be an effect factory; a function passed there is now
ignored for compatibility.

### ``rs`string` ``

A reactive string. Values may be static, signals or plain functions.

```ts
const label = rs`btn btn-${size} ${() => (active() ? "on" : "off")}`;
```

### `combine(...sources)`

Collects sources into a tuple; reading it subscribes to all of them.

```ts
const [width, height] = combine(widthSignal, heightSignal)();
```

## Tag factories

Named factories: `div`, `span`, `section`, `article`, `aside`, `nav`, `header`,
`footer`, `main`, `slot`, `p`, `h1`–`h6`, `strong`, `em`, `b`, `i`, `u`, `s`,
`small`, `mark`, `sub`, `sup`, `del`, `ins`, `blockquote`, `cite`, `pre`, `code`,
`br`, `hr`, `form`, `input`, `textarea`, `button`, `label`, `select`, `option`,
`progress`, `meter`, `fieldset`, `legend`, `optgroup`, `datalist`, `output`, `ul`,
`ol`, `li`, `dl`, `dt`, `dd`, `menu`, `table`, `thead`, `tbody`, `tfoot`, `caption`,
`colgroup`, `col`, `tr`, `td`, `th`, `address`, `hgroup`, `dialog`, `template`, `abbr`,
`dfn`, `q`, `kbd`, `samp`, `time`, `bdi`, `bdo`, `wbr`, `a`, `img`, `picture`, `source`,
`track`, `iframe`, `embed`, `area`, `audio`, `video`, `canvas`, `figure`, `figcaption`,
`details`, `summary`.

```ts
div(config?, ...children)
div(...children)          // the config may be omitted
```

### `el(tagName, config?, ...children)`

A factory with an arbitrary tag — for tags not covered by the named ones.

### `appendChildren(parent, children)`

Appends children following the common rules (reactive text, skipping empty values).

### `buildFragment(content)`

Builds `FlowContent` into a fragment using the same rules.

## Element config

| Key | Type | Description |
| --- | --- | --- |
| `.property` | `MaybeReactive<T>` | writes a DOM property; function-valued properties are excluded by the type |
| `@event` | `(event) => void` | listener; the event type and `currentTarget` are inferred |
| `class` | `ClassValue` | classes, see below |
| `attrs` | `Record<string, MaybeReactive<AttrValue>>` | attributes |
| `style` | `Record<string, MaybeReactive<StyleValue>>` | inline styles |
| `show` | `MaybeReactive<boolean>` | toggling through `display` |

**Attributes.** `null`/`undefined` remove the attribute; `false` removes it too,
`true` sets it empty (like `disabled`). The exception is `aria-*`: there the
literal `"true"`/`"false"` is written, because a missing `aria-checked` is not the
same as `aria-checked="false"`.

**Styles.** The key may be camelCase, kebab-case or a `--custom-property`. An
empty string, `null` and `undefined` remove the property. Custom properties keep
their case.

**show.** Remembers the inline `display` that was set before hiding and restores
it on show.

Web components additionally accept the `#slotName` key — a slot template.

## Classes

`ClassValue` is a string, `false`/`null`/`undefined`, a source function, a
conditions object, a `cls` config, or an array of any of those.

```ts
class: "card"
class: ["card", "wide"]
class: ["tab", { active: isActive, disabled: () => !enabled() }]
class: cls`btn btn-${size}`
```

### ``cls`string` ``

A template tag returning a config: ``div(cls`card ${theme}`)``. Anything written
without a space is glued into a single token (`btn-${size}` → `btn-lg`), while
space-separated parts stay separate tokens. It spreads next to other keys:
``div({ ...cls`card`, ".id": "x" })``.

Each source owns its own tokens: a shared class stays until every source releases it.

### `applyClass(element, value)`

Applies a `ClassValue` to an existing element.

## Flow control

### `when(condition, renderTrue, renderFalse?)`

Conditional rendering. The branch is rebuilt only when the truthiness of the
condition changes. The removed branch is destroyed together with its effects.
Returns a fragment.

### `dynamic(render)`

A reactive region: rebuilt when any signal read directly in `render` changes.
Effects created inside live in the block's scope and do not become its
dependencies.

### `each(source, renderItem, getKey?)`

Keyed list rendering with node reuse. `renderItem` receives signals for the item
and the index. The default key is the item itself; pass `getKey` for objects.
Duplicate keys produce a warning, and such entries are recreated on every update.
Reordering uses `Element.moveBefore()` where the browser has it: the move is
atomic, and components, `iframe` and `video` keep their state.

The blocks do not wrap content in an extra element.

## Components

### `defineComponent(config)`

Returns an abstract class. The subclass implements `render(): FlowContent` — an element,
a fragment, an array of nodes or nothing; a root wrapper is not required.

| Config field | Type | Description |
| --- | --- | --- |
| `props` | `Record<string, unknown>` | initial values; define the types and the observed attributes |
| `events` | `Record<string, unknown>` | event names; the value defines the payload type |
| `eventOptions` | `Record<string, EventOptions>` | `bubbles`, `composed`, `cancelable` per event |
| `slots` | `Record<string, unknown>` | slots; the value defines the context type |
| `shadow` | `"open" \| "closed" \| ShadowRootInit` | shadow root mode, `open` by default |
| `styles` | `ComponentStyles` | the component's CSS |
| `reflect` | `(keyof props)[]` | props mirrored to host attributes |
| `form` | `boolean` | a form-associated component |

Attribute and event names are the kebab-case form of the key: `maxCount` →
`max-count`, `valueChange` → `value-change`. An attribute value is parsed by the
type of the prop's initial value:

| Initial value | Attribute → prop |
| --- | --- |
| `boolean` | as in HTML: present → `true`, `"false"` → `false`, removed → `false` |
| `number` | `Number()`; a non-number or an empty string falls back to the initial value |
| `string` | the raw string: `label="42"` stays `"42"` |
| anything else (objects, arrays, `null`) | `JSON.parse`; whatever fails to parse stays a string |

Removing the attribute returns a non-boolean prop to its initial value.

**reflect.** Props from the list are mirrored to host attributes: `true` → an
empty attribute, `false`/`null`/`undefined` → no attribute, strings and numbers
as is, objects as JSON. Needed for `:host([disabled])` and outside selectors.
Reflection starts on connection, not in the constructor; the attribute parses
back into the same value, so there is no loop. Also available as `static reflect`.

```ts
class Chip extends defineComponent({
  props: { disabled: false, variant: "plain" },
  reflect: ["disabled", "variant"],
}) { ... }
```

**form.** `form: true` sets `static formAssociated = true` and calls
`attachInternals()` in the constructor: the component's value goes into
`FormData`, and validation, form reset and `disabled` on a `fieldset` work.

### `payload<T>()`

A phantom value: it defines the type of an event payload or a slot context and
creates nothing at runtime.

### Component members

| Member | Description |
| --- | --- |
| `props` | an object of signals |
| `events` | an object of emitters: `this.events.change(value)` |
| `renderSlot(name, context, fallback?)` | renders a slot; returns a fragment |
| `provide(key, value)` | puts a value into the subtree's context |
| `inject(key)` | takes a value from the nearest provider |
| `addEffect(fn)` | creates an effect owned by the component |
| `internals` | `ElementInternals`; throws `[rwc] <tag> is not form-associated...` without `form: true` |
| `setFormValue(value)` | the value for the form; given a signal or a function, keeps `FormData` in sync — call it in `render()` |
| `formDisabled` | a signal: a `fieldset` or form above is disabled (from `formDisabledCallback`) |
| `formReset()` | a `protected` hook called on form reset; by default returns all props to their initial values |
| `shadow` | the shadow root (`protected`) |
| `static styles` | the component's CSS |
| `static shadowOptions` | shadow root options |
| `static reflect` | props mirrored to attributes |
| `static formAssociated` | the component participates in forms |
| `static renderTagName` | the tag the component is registered under |

**Disconnection.** Teardown (destroying effects and clearing the shadow root) is
deferred to a microtask. If the element is inserted back within the same task —
a move via `insertBefore`, a reorder in `each`, a transfer into a portal —
nothing is re-rendered: focus, input text and scroll are preserved. Components
also implement `connectedMoveCallback` for atomic `moveBefore()` moves.

### `useCustomComponent(component, tagName)`

Registers the component and returns a factory.

```ts
const counter = useCustomComponent(Counter, "x-counter");
counter({ ".value": 5, "@change": (e) => e.detail }, "children");
```

### `configCustomComponent(component, baseTagName)`

Returns `[factory, register]`. The factory throws if called before registration.

```ts
const [UwcButton, registerUwcButton] = configCustomComponent(Button, "uwc-button");
registerUwcButton({ postfix: "moduleA" }); // <uwc-button-modulea>, returns the tag name
```

The postfix is lowercased. Registering the same tag again is safe; trying to
change the tag logs an error — one class lives under one tag.

### `createComponent(render)`

A function component. `render` receives props and children and returns the root
element; the wrapper applies `class`, `attrs`, `style` and `show` from the props
to it.

```ts
const Card = createComponent<{ title: string }, HTMLElement>((props, ...children) =>
  section(cls`card`, h3(props.title), ...children),
);
```

## Styles

### ``css`...` ``

A template tag for CSS. It does not change the text — it exists for syntax
highlighting and formatting.

### `ComponentStyles`

`string | CSSStyleSheet | ReadonlyArray<string | CSSStyleSheet>`.

Strings are cached: identical CSS produces one `CSSStyleSheet` per page, shared by
every instance. Without support for constructable stylesheets a `<style>` fallback
is used.

### `adoptStyles(root, styles)`

Attaches styles to a shadow root; returns the nodes that have to be inserted into
the markup on the fallback path.

## Context

### `createContext(name, defaultValue?)`

A context key. With a default value `inject` always returns `T`; without one the
type includes `undefined`.

### `provideOn(node, key, value)` / `injectFrom(node, key)`

The same as the component methods but for an arbitrary node. `injectFrom` looks
for the nearest provider up the tree, crossing shadow boundaries; the lookup is
lazy and the found signal is remembered.

## Async

### `resource(fetcher, options?)`

```ts
const found = resource((abort) => fetch(url(), { signal: abort }).then((r) => r.json()), {
  initialValue: [],
});
```

| Member | Type | Description |
| --- | --- | --- |
| `data` | `ReadonlySignal<T \| undefined>` | the last successful response |
| `error` | `ReadonlySignal<unknown>` | the failure reason; reset on a new request |
| `loading` | `ReadonlySignal<boolean>` | a request is in flight |
| `refetch` | `() => void` | repeat with the same dependencies |

Signals read inside the `fetcher` become dependencies. The previous request is
cancelled through `AbortSignal` and a stale response is ignored. A synchronous
`fetcher` never raises `loading`. The effect belongs to the current component.

### `firstUpdate(source, cb)`

Calls `cb` on the first change of the source; the initial value is skipped and the
effect is destroyed after firing.

## Effect ownership

### `createRoot(fn)`

A root owner for code outside components. `fn` receives `dispose` and returns
anything — usually markup.

### `createEffectScope()`

A local scope: `run(fn)` executes code with this owner, `dispose()` destroys
everything created inside.

### `withEffectHost(host, fn)` / `getEffectHost()` / `hostEffect(fn)`

Low-level ownership primitives. `hostEffect` creates an effect and hands it to the
current owner; without an owner it warns and creates a standalone effect.

## Server rendering

### `renderToString(build, options?)`

Renders markup on a server-side DOM (happy-dom, linkedom) into an HTML string. Shadow
roots are emitted as Declarative Shadow DOM with the component styles; anchor comments
are dropped unless `{ comments: true }`. Effects are destroyed before returning. See
[Server rendering](./ssr.md).

## Types

| Type | Description |
| --- | --- |
| `ReadonlySignal<T>` | a readable source: call + `peek` |
| `ReactiveSignal<T>` | `ReadonlySignal<T>` plus `set`, `update` |
| `MaybeSignal<T>` | a value or a signal (component props) |
| `MaybeReactive<T>` | a value, a signal or a plain function (children, attributes, styles) |
| `SignalOptions<T>` | `{ equals?: EqualsFn<T> \| false }` |
| `EffectCb` | an effect handle with `destroy()` |
| `ElementChild` | string, number, `boolean`, `null`, `undefined`, node or function |
| `FlowContent` | `ElementChild` or an array of them |
| `ElementOptions<E>` | tag factory config |
| `CustomElementOptions<B>` | component factory config |
| `ComponentClass<P, E, S>` | what `defineComponent` returns |
| `ComponentBase<P, E, S>` | a component instance |
| `ComponentFactory<B>` | a component factory |
| `ContextKey<T>` | a context key |
| `Resource<T>` | the result of `resource` |
| `ComponentStyles` | a component's CSS |
| `FormValue` | `File \| string \| FormData \| null` — what `setFormValue` accepts |
| `CustomTagName` | `` `${string}-${string}` `` |
