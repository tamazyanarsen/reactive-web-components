# Guide

[Русский](../ru/guide.md) · [API reference](./api.md) · [Recipes](./recipes.md) · [Frameworks](./frameworks.md) · [SSR](./ssr.md)

- [Installation](#installation)
- [Your first component](#your-first-component)
- [Signals](#signals)
- [Effects](#effects)
- [Derived values](#derived-values)
- [Markup](#markup)
- [Flow control](#flow-control)
- [Components](#components)
- [Styles](#styles)
- [Slots](#slots)
- [Context](#context)
- [Async](#async)
- [Function components](#function-components)
- [Code outside components](#code-outside-components)
- [Registration and versions](#registration-and-versions)
- [How it works](#how-it-works)

## Installation

```bash
npm install @rwcjs/core
# or a ready project with Vite, router and forms
npm create @rwcjs@latest my-app
```

The package is ESM. Any bundler works (Vite, Rspack, webpack, esbuild, bun). No
template compiler and no editor plugin are needed: markup is ordinary TypeScript.

## Your first component

```ts
import { defineComponent, div, span, useCustomComponent } from "@rwcjs/core";

class Hello extends defineComponent({
  props: { name: "world" },
}) {
  render() {
    return div({}, "hello, ", span(this.props.name));
  }
}

export const hello = useCustomComponent(Hello, "x-hello");
```

`defineComponent` assembles the base class: the keys of `props` become signals
and the list of observed attributes, the keys of `events` become emitters. The
subclass must implement `render()`. It may return an element, a fragment (from `when`,
for instance) or an array of nodes — a root wrapper is not required.

`useCustomComponent` registers the tag and returns a factory:

```ts
document.body.append(hello({ ".name": "rwc" }));
// <x-hello> with a shadow root inside
```

Reactive markup outside a component — the app's root, for example — goes inside
`createRoot`, which owns its effects; otherwise rwc warns that nothing will dispose them:

```ts
import { createRoot, div } from "@rwcjs/core";

document.querySelector("#app")!.append(createRoot(() => div({}, hello({ ".name": "rwc" }))));
```

More in [Code outside components](#code-outside-components).

## Signals

A signal is a value-function with a write method.

```ts
import { signal } from "@rwcjs/core";

const count = signal(0);

count();                          // 0 — read (and subscribe, if inside an effect)
count.set(1);                     // write
count.update((prev) => prev + 1); // write based on the previous value
count.peek();                     // 2 — read without subscribing
```

Writes are synchronous: after `set` the dependent markup is already updated, no
microtask to wait for.

An equal value does not wake subscribers. The default comparison is `Object.is`
and can be replaced:

```ts
// The array is mutated in place and written by the same reference — comparison gets in the way.
const items = signal<string[]>([], { equals: false });

// Custom comparison: the point is "the same" while the coordinates match.
const point = signal({ x: 0, y: 0 }, { equals: (a, b) => a.x === b.x && a.y === b.y });
```

### batch

Several writes in a row wake subscribers once per write. `batch` collapses them
into a single run:

```ts
import { batch } from "@rwcjs/core";

batch(() => {
  firstName.set("Ada");
  lastName.set("Lovelace");
}); // subscribers of both signals run here, once
```

A `computed` read inside `batch` is already up to date: it recomputes on read,
without waiting for the group to end.

## Effects

An effect runs immediately and then on every change of what it read.
Dependencies are collected automatically and re-collected on every run.

```ts
import { effect, onCleanup, signal } from "@rwcjs/core";

const seconds = signal(0);

const ticker = effect(() => {
  const id = setInterval(() => seconds.update((n) => n + 1), 1000);
  onCleanup(() => clearInterval(id));
});

ticker.destroy(); // stops the timer: onCleanup runs
```

`onCleanup` runs before every next run and on destruction. `onDispose` runs only
on destruction and is registered on the first run:

```ts
effect(() => {
  const controller = new AbortController();
  onCleanup(() => controller.abort()); // on every restart

  onDispose(() => console.log("effect is gone")); // once, at the end
});
```

### Conditional dependencies

Dependencies are re-collected, so a conditional branch subscribes correctly:

```ts
effect(() => {
  // While useA() is truthy, changes to b do not wake the effect.
  console.log(useA() ? a() : b());
});
```

### Nested effects

An effect created during another effect's run becomes its child: it dies when the
parent restarts and is created again. Effects never pile up, and destroying the
parent cascades through the whole subtree.

```ts
effect(() => {
  const user = currentUser();

  // A separate subscription per user; the old one goes away when user changes.
  effect(() => console.log(user, notificationsFor(user)()));
});
```

If a nested effect must outlive the parent's restart, break the ownership with
`untracked`:

```ts
effect(() => {
  trigger();
  untracked(() => effect(() => /* lives on its own */ null));
});
```

### untracked

Reads without subscribing:

```ts
effect(() => {
  const shown = visible();                       // a dependency
  const theme = untracked(() => currentTheme()); // not a dependency
});
```

For a one-off read of a single signal, `peek()` is shorter.

### Cycle protection

An effect that writes to a signal it depends on would loop forever. Such a case
throws instead of hanging the page:

```ts
effect(() => count.set(count() + 1));
// Error: [rwc] infinite loop in effects: an effect writes to a signal it depends on
```

The usual cure is `peek()` or `update()` — both read without subscribing.

## Derived values

Two options, both returning a source you can read and pass around.

```ts
import { computed, derived } from "@rwcjs/core";

// Lazy and memoised: computes on read, recomputes only
// when dependencies have actually changed.
const total = computed(() => price() * quantity());

// No memoisation: compute runs on every read.
const label = derived(() => `${price()} USD`);
```

Use `computed` for expensive work and for values read from several places; use
`derived` for cheap expressions.

`computed` is lazy: until someone reads it, it computes nothing. A write to a
source only marks it stale; the value is recomputed on the next read and only if
a source has really changed. If the new value is equal to the old one
(`Object.is` or the `equals` option), observers are not woken:

```ts
const isAdult = computed(() => age() >= 18);
effect(() => console.log(isAdult())); // does not rerun when age goes 30 → 31
```

Effects never see an intermediate state. In the diamond `a → (b, c) → d` the
effect on `d` runs once and sees `b` and `c` already consistent, however many
levels of `computed` lie in between.

`computed` subscribes to its sources only while some effect reads it. It needs no
owner and does not leak, so it can be declared anywhere — in `render()`, at
module level, in a store.

Also available:

```ts
import { combine, rs } from "@rwcjs/core";

const size = rs`btn btn-${sizeSignal}`;  // reactive string
const both = combine(width, height);      // tuple of values
const [w, h] = both();
```

## Markup

Every tag has a factory. The first argument is an optional config, the rest are
children.

```ts
import { a, button, div, input, span } from "@rwcjs/core";

div(
  { class: "card" },
  span("title"),
  button({ "@click": () => console.log("click") }, "press"),
);

div("just text");  // the config may be omitted
```

### Config keys

| Key | Effect |
| --- | --- |
| `.property` | writes a DOM property of the element |
| `@event` | attaches a listener |
| `class` | classes: string, array, conditions object, `cls` |
| `attrs` | arbitrary attributes: `data-*`, `aria-*`, `role` |
| `style` | inline styles, including CSS custom properties |
| `show` | toggles visibility through `display` |

```ts
input({
  ".value": text,                       // a property, not an attribute
  ".disabled": () => text().length > 20,
  "@input": (event) => text.set(event.currentTarget.value),
  class: ["field", { invalid: hasError }],
  attrs: { "aria-invalid": hasError, "data-role": "search" },
  style: { "--field-hue": hue },
  show: visible,
});
```

The dot means a property: the value is written straight into the element object,
skipping serialisation to a string. For `data-*`, `aria-*` and anything that
needs a real attribute there is `attrs`.

An event handler receives the exact type: `@input` on an `<input>` gets an
`InputEvent`, and `currentTarget` is typed as that specific element.

### Reactivity in markup

Wherever a value cannot be a function, **any function counts as a reactive
source**. A signal and a plain function are equivalent:

```ts
span(count);                    // signal
span(() => count() * 2);        // expression
div({ attrs: { title: () => user().name } });
div({ style: { width: () => `${percent()}%` } });
```

Only the node itself becomes reactive: the text, property or attribute changes,
not the subtree.

Component props follow a different rule: there a value may legitimately be a
function (a template prop, for instance), so a reactive source must be a signal:

```ts
tabs({ ".renderTab": (tab) => span(tab.title) }); // the function is a value
tabs({ ".active": activeSignal });                 // the signal is a source
```

### Children

Children may be strings, numbers, nodes and reactive sources. `null`, `undefined`
and `false` are skipped, so the usual `condition && markup` works:

```ts
div({}, "score: ", count, isAdmin() && span("admin"));
```

### Classes

```ts
import { cls } from "@rwcjs/core";

div({ class: "card" });
div({ class: ["card", "wide"] });
div({ class: ["tab", { active: isActive, disabled: () => !enabled() }] });

div(cls`card`);                             // the class is the only config key
div(cls`btn btn-${size}`);                  // btn-lg as a single token
div({ ...cls`card`, ".id": "main" });        // alongside other keys
```

`cls` is the same config written shorter. The rule used across the examples and
the playground: **nothing in the config but the class — use `cls`; anything else —
use the object form**. The spread `{ ...cls`...` }` is rarely needed: it is longer
than a plain `class` key and only pays off together with glued interpolation.

Each source owns only its own tokens: if two sources produce the same class,
removing it from one does not drop it while the other still holds it. A token
present in both states never leaves `classList` even for a moment — otherwise CSS
transitions would restart.

## Flow control

### when

Conditional rendering. The branch is rebuilt only when the truthiness of the
condition changes.

```ts
import { when } from "@rwcjs/core";

div(
  {},
  when(isLoggedIn, () => profile(), () => loginForm()),
);
```

The removed branch is destroyed together with its effects.

### show

Hides an element through `display`, keeping the DOM, its state and its effects
alive:

```ts
div({ show: isOpen }, heavyContent());
```

Reach for `show` when toggling is frequent and the content is expensive to
rebuild; use `when` when the content should really disappear.

### each

Keyed lists that reuse nodes. `renderItem` receives **signals** for the item and
the index:

```ts
import { each } from "@rwcjs/core";

ul(
  {},
  each(
    users,
    (user, index) => li({}, () => `${index() + 1}. ${user().name}`),
    (user) => user.id,   // key; defaults to the item itself
  ),
);
```

When the list updates, nodes are reused: new data changes the contents of the
signals rather than recreating markup. Reordering moves as few nodes as possible —
items already in the right relative order stay put. Where the browser has
`Element.moveBefore()`, the move is atomic: components are not disconnected,
and focus and the state of `iframe` and `video` survive.

The default key is the item itself, which suits primitives. For objects pass
`getKey`, otherwise entries are recreated on every update (the library warns
about that).

### dynamic

A fully reactive region: rebuilt whenever any signal read directly in its body
changes.

```ts
import { dynamic } from "@rwcjs/core";

div({}, dynamic(() => (user() ? profile(user()) : loginForm())));
```

`dynamic` is more expensive than `when`: it rebuilds the markup. Use it when the
structure itself changes, not just a value.

Neither `when`, `each` nor `dynamic` wraps content in an extra element — their
place in the DOM is held by comment anchors, so `ul > li`, `:nth-child` and
grid/flex layouts keep working.

## Components

```ts
class Field extends defineComponent({
  props: { value: "", label: "", disabled: false },
  events: { valueChange: payload<string>(), submit: payload<void>() },
  eventOptions: { submit: { bubbles: false } },
  shadow: "open",
  styles: css`:host { display: block }`,
}) {
  render() {
    return label(
      {},
      this.props.label,
      input({
        ".value": this.props.value,
        ".disabled": this.props.disabled,
        "@input": (event) => {
          this.props.value.set(event.currentTarget.value);
          this.events.valueChange(event.currentTarget.value);
        },
      }),
    );
  }
}
```

### Props

Initial values define both the types and the list of observed attributes. The key
`maxCount` corresponds to the attribute `max-count`.

Two ways to write:

```ts
field({ ".value": "text" });             // straight into the signal: any type, no serialisation
element.setAttribute("value", "text");   // through an attribute: parsed by the prop's type
```

An attribute is always a string, so it is parsed by the type of the prop's
initial value:

- `boolean` — as in HTML: the attribute is present, so `true`
  (`<x-switch disabled>`); `"false"` and a removed attribute give `false`;
- `number` — `Number()`; a non-number or an empty string falls back to the
  initial value;
- `string` — the string as is: `label="42"` stays `"42"`;
- anything else (objects, arrays, `null`) — JSON, and whatever fails to parse
  stays a string.

Removing the attribute returns a non-boolean prop to its initial value.

A reactive prop links parent to child:

```ts
field({ ".value": nameSignal }); // the effect belongs to the parent
```

### Events

The key `valueChange` produces the event `value-change`. The payload is described
with `payload<T>()` — that is a type only, nothing is created at runtime.

```ts
this.events.valueChange("new");  // dispatchEvent(new CustomEvent("value-change", { detail }))
```

By default events bubble and cross the shadow boundary
(`bubbles: true, composed: true`); `eventOptions` changes that.

You can listen through the factory config or with a plain `addEventListener`:

```ts
field({ "@valueChange": (event) => console.log(event.detail) }); // detail is typed
element.addEventListener("value-change", handler);
```

### Reflecting props to attributes

Styles often depend on state: `:host([disabled])`. `reflect` mirrors props to
host attributes:

```ts
class Chip extends defineComponent({
  props: { disabled: false, variant: "plain" },
  reflect: ["disabled", "variant"],
  styles: css`:host([disabled]) { opacity: 0.5 }`,
}) { ... }
```

`true` becomes an empty attribute, `false`/`null`/`undefined` remove it, strings
and numbers are written as is, objects as JSON. Reflection starts when the
element connects, not in the constructor. Attribute and prop do not loop: the
attribute parses back into the same value. On the class the same is
`static reflect`.

### Forms

`form: true` makes the component form-associated: its value goes into
`FormData`, and validation, form reset and `disabled` on a `fieldset` work.

```ts
class Rating extends defineComponent({ props: { value: 0 }, form: true }) {
  render() {
    this.setFormValue(() => String(this.props.value()));
    return button(
      { ".disabled": this.formDisabled, "@click": () => this.props.value.update((n) => n + 1) },
      this.props.value,
    );
  }
}
```

- `setFormValue(value)` — given a signal or a function, keeps `FormData` in
  sync; call it in `render()`.
- `internals` — the `ElementInternals`: `setValidity`, `states`, `form`,
  `labels`. Without `form: true` it throws.
- `formDisabled` — a signal, `true` while a `fieldset` or form above is disabled.
- `formReset()` — a protected hook for form reset; by default returns every prop
  to its initial value. Override it if the reset should do something else.

A full example is in the [recipes](./recipes.md#a-form-associated-input).

### Lifecycle

`render()` is called when the element connects to the DOM. Every effect created
during the render — reactive children, properties, attributes, classes,
`resource` — belongs to the component and is destroyed together with the markup
when it disconnects. A `computed` is not owned by anyone: when the component's
effects die, it simply stops being subscribed to its sources. On reconnection
the component renders again.

Teardown runs on a microtask rather than inside `disconnectedCallback`. If the
element is inserted back within the same task — moved with `insertBefore`,
reordered by `each`, transferred into a portal — nothing is re-rendered: focus,
input text and scroll stay. Atomic moves through `moveBefore()` are handled by
`connectedMoveCallback` and do not disconnect the component at all.

In tests this means teardown is not visible right after `remove()`:

```ts
element.remove();
await new Promise((resolve) => setTimeout(resolve, 0));
expect(element.shadowRoot!.textContent).toBe(""); // teardown has run
```

No manual cleanup is needed: timers and subscriptions go on `onCleanup` inside an
effect and leave with it.

### Shadow root

`open` by default, so tests and devtools can reach inside. The closed mode is an
explicit flag:

```ts
defineComponent({ props: {}, shadow: "closed" });
defineComponent({ props: {}, shadow: { mode: "open", delegatesFocus: true } });
```

## Styles

CSS is declared on the class and parsed once per page — instances share a single
`CSSStyleSheet` through `adoptedStyleSheets`:

```ts
import { css } from "@rwcjs/core";

class Card extends defineComponent({ props: {} }) {
  static override styles = css`
    :host { display: block; border: 1px solid var(--card-border, #ddd) }
    .title { font-weight: 600 }
  `;

  render() {
    return div(cls`title`, "title");
  }
}
```

An array works too, which is handy for a shared base:

```ts
defineComponent({ props: {}, styles: [BASE, CARD] });
```

Page styles do not reach inside the shadow root, while CSS custom properties are
inherited: that is the intended way to theme components from outside.

## Slots

### Native

A plain `<slot>` works with no special machinery — the content lives in the
host's light DOM:

```ts
class Panel extends defineComponent({ props: {} }) {
  render() {
    return div(cls`panel`, slot(), slot({ ".name": "footer" }));
  }
}

panel({}, div("body"), div({ attrs: { slot: "footer" } }, "bottom"));
```

### With their own context

When the parent's template needs data from the component, declare slots together
with the type of their context:

```ts
class Table extends defineComponent({
  props: { rows: [] as Row[] },
  slots: {
    row: payload<{ row: ReadonlySignal<Row>; index: ReadonlySignal<number> }>(),
    empty: payload<void>(),
  },
}) {
  render() {
    return when(
      () => this.props.rows().length > 0,
      () =>
        ul(
          {},
          each(
            this.props.rows,
            (row, index) => this.renderSlot("row", { row, index }, () => li(() => row().name)),
            (row) => row.id,
          ),
        ),
      () => this.renderSlot("empty", undefined, () => p("empty")),
    );
  }
}
```

The parent passes templates with `#name` keys:

```ts
table({
  ".rows": rows,
  "#row": ({ row, index }) => li({}, () => `${index()}: ${row().name}`),
  "#empty": () => p("nothing found"),
});
```

The context is typed: `row` and `index` in the template are inferred from the
declaration. The third argument of `renderSlot` is the fallback content used when
no template was passed.

The context usually consists of signals: then the template updates along with the
data instead of recreating nodes.

## Context

A value available to the whole subtree without threading props through it.

```ts
import { createContext } from "@rwcjs/core";

export const ThemeKey = createContext<"light" | "dark">("theme", "light");
```

The second argument is the default value. Without it the type includes
`undefined`, and the consumer has to handle that case.

```ts
class App extends defineComponent({ props: {} }) {
  render() {
    const theme = signal<"light" | "dark">("dark");
    this.provide(ThemeKey, theme);   // a plain value works too: this.provide(ThemeKey, "dark")
    return div({}, toolbar());
  }
}

class Toolbar extends defineComponent({ props: {} }) {
  render() {
    const theme = this.inject(ThemeKey); // a signal: updates with the provider
    return div({ class: ["bar", { dark: () => theme() === "dark" }] });
  }
}
```

The lookup walks up the tree across shadow boundaries and finds the nearest
provider. It also works for slotted content — that is a descendant of the host too.

Declare the value in the provider's `render()` or earlier: descendants read the
context when they connect to the DOM, which happens after `render()` has returned.

## Async

```ts
import { resource } from "@rwcjs/core";

class Search extends defineComponent({ props: { query: "" } }) {
  render() {
    const found = resource(
      (abort) =>
        fetch(`/api/search?q=${this.props.query()}`, { signal: abort }).then((r) => r.json()),
      { initialValue: [] as Person[] },
    );

    return div(
      {},
      when(found.loading, () => span("searching…")),
      when(found.error, () => span("failed")),
      ul({}, each(() => found.data() ?? [], (person) => li(() => person().name), (p) => p.id)),
      button({ "@click": found.refetch }, "try again"),
    );
  }
}
```

Signals read inside the `fetcher` become dependencies: changing the query starts a
new request. The previous one is cancelled through `AbortSignal` and its response
is ignored, so the "stale response overwrites the fresh one" race cannot happen.
When the component disconnects, the request is cancelled.

There is also a one-shot reaction to the first change:

```ts
import { firstUpdate } from "@rwcjs/core";

// Skips the initial value, fires once and unsubscribes.
firstUpdate(this.props.value, (value) => this.events.touched(value));
```

## Function components

A piece of markup that needs neither its own tag, nor a shadow root, nor
attributes:

```ts
import { createComponent } from "@rwcjs/core";

const Card = createComponent<{ title: string }, HTMLElement>((props, ...children) =>
  section(cls`card`, h3(props.title), ...children),
);

Card({ title: "Report", class: ["wide"] }, p("body"));
```

The wrapper adds `class`, `attrs`, `style` and `show` to the props and applies
them to the root element, so the call looks just like a plain tag. Effects created
inside belong to the component whose `render()` the call happened in.

## Code outside components

Effects created outside `render()` have no owner to destroy them — the library
warns about that. For the entry point, module-level state and tests there is a
root owner:

```ts
import { createRoot } from "@rwcjs/core";

const app = createRoot(() => div({}, header(), counter({ ".value": total })));
document.getElementById("app")!.append(app);
```

If you need to be able to tear all of it down, take `dispose` as the first
argument:

```ts
const app = createRoot((dispose) => {
  onSignOut(dispose);
  return div({}, dashboard());
});
```

## Registration and versions

`useCustomComponent` registers immediately. When the moment of registration
matters, separate the declaration from it:

```ts
import { configCustomComponent } from "@rwcjs/core";

export const [UiButton, registerUiButton] = configCustomComponent(Button, "ui-button");
```

The application decides which tag the component appears under:

```ts
registerUiButton();                       // <ui-button>
registerUiButton({ postfix: "v1-8" }); // <ui-button-v1-8>
```

Factory calls do not change:

```ts
UiButton({ ".type": "primary" }, "Press");
```

That is how two versions of a UI kit coexist on one page: each build registers its
own tags with its own postfix while application code stays the same. A single
class can be registered under one tag only — that is a `customElements` rule, so
different versions have to be different builds. The full setup is on a separate page:
[UI kit versions in microfrontends](./microfrontends.md).

## How it works

**Effect ownership.** While `render()` runs, the library knows the current
owner — the component whose render we are inside. Every effect created at that
time is recorded on it. The owner cannot be found through the DOM: during a render
the nodes are not inserted yet.

The `when`, `each` and `dynamic` blocks create their own scopes: content built
inside is destroyed together with the branch or the list entry.

**The queue.** Writing to a signal puts its subscribers into a queue and drains it
right away. The queue is a set, so an effect reachable by two paths runs once.
`batch` postpones draining until the group is left.

**Lazy computed (push-pull).** A write does not recompute anything: it marks the
`computed` nodes downstream as possibly stale and queues the effects behind them.
Before running, an effect pulls its `computed` sources; if none of them actually
changed value, the effect is skipped. That is why there are no glitches and no
wasted runs.

**The effect tree.** A nested effect is a child of the one whose run created it.
Before every restart the parent destroys its children, and on destruction it takes
the whole subtree with it. That is why a `dynamic` inside an `each` inside a
component cleans up at every level.

**Lists.** `each` matches old and new entries by key and then fixes the order,
moving only the nodes that are genuinely out of place: the positions that already
form the correct relative order are found as the longest increasing subsequence.
