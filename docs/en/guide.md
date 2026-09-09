# Guide

[Русский](../ru/guide.md) · [API reference](./api.md) · [Recipes](./recipes.md)

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
npm install @reactive-web-components/rwc
```

The package is ESM. Any bundler works (Vite, Rspack, webpack, esbuild, bun). No
template compiler and no editor plugin are needed: markup is ordinary TypeScript.

## Your first component

```ts
import { defineComponent, div, span, useCustomComponent } from "@reactive-web-components/rwc";

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

## Signals

A signal is a value-function with a write method.

```ts
import { signal } from "@reactive-web-components/rwc";

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
import { batch } from "@reactive-web-components/rwc";

batch(() => {
  firstName.set("Ada");
  lastName.set("Lovelace");
}); // subscribers of both signals run here, once
```

Inside `batch` derived values are not recomputed yet — that is the price of
grouping.

## Effects

An effect runs immediately and then on every change of what it read.
Dependencies are collected automatically and re-collected on every run.

```ts
import { effect, onCleanup, signal } from "@reactive-web-components/rwc";

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
// Error: infinite loop in effects
```

The usual cure is `peek()` or `update()` — both read without subscribing.

## Derived values

Two options, both returning a source you can read and pass around.

```ts
import { computed, derived } from "@reactive-web-components/rwc";

// Memoises the result, recomputes when dependencies change.
// Lives on an effect owned by the current component.
const total = computed(() => price() * quantity());

// No memoisation: compute runs on every read.
// No effect and no owner — nothing to leak.
const label = derived(() => `${price()} USD`);
```

Use `computed` for expensive work and for values read from several places; use
`derived` for cheap expressions and for code outside components.

Also available:

```ts
import { combine, rs } from "@reactive-web-components/rwc";

const size = rs`btn btn-${sizeSignal}`;  // reactive string
const both = combine(width, height);      // tuple of values
const [w, h] = both();
```

## Markup

Every tag has a factory. The first argument is an optional config, the rest are
children.

```ts
import { a, button, div, input, span } from "@reactive-web-components/rwc";

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
import { cls } from "@reactive-web-components/rwc";

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
import { when } from "@reactive-web-components/rwc";

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
import { each } from "@reactive-web-components/rwc";

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
items already in the right relative order stay put.

The default key is the item itself, which suits primitives. For objects pass
`getKey`, otherwise entries are recreated on every update (the library warns
about that).

### dynamic

A fully reactive region: rebuilt whenever any signal read directly in its body
changes.

```ts
import { dynamic } from "@reactive-web-components/rwc";

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
element.setAttribute("value", "text");   // through an attribute: parsed with JSON.parse
```

An attribute is parsed as JSON, and whatever fails to parse stays a string: `"5"`
becomes a number, `"true"` a boolean, `"hello"` a string. Removing the attribute
returns the prop to its initial value.

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

### Lifecycle

`render()` is called when the element connects to the DOM. Every effect created
during the render — reactive children, properties, attributes, classes,
`computed`, `resource` — belongs to the component and is destroyed together with
the markup when it disconnects. On reconnection the component renders again.

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
import { css } from "@reactive-web-components/rwc";

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
import { createContext } from "@reactive-web-components/rwc";

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
import { resource } from "@reactive-web-components/rwc";

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
import { firstUpdate } from "@reactive-web-components/rwc";

// Skips the initial value, fires once and unsubscribes.
firstUpdate(this.props.value, (value) => this.events.touched(value));
```

## Function components

A piece of markup that needs neither its own tag, nor a shadow root, nor
attributes:

```ts
import { createComponent } from "@reactive-web-components/rwc";

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
import { createRoot } from "@reactive-web-components/rwc";

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
import { configCustomComponent } from "@reactive-web-components/rwc";

export const [UwcButton, registerUwcButton] = configCustomComponent(Button, "uwc-button");
```

The application decides which tag the component appears under:

```ts
registerUwcButton();                       // <uwc-button>
registerUwcButton({ postfix: "moduleA" }); // <uwc-button-modulea>
```

Factory calls do not change:

```ts
UwcButton({ ".type": "primary" }, "Press");
```

That is how two versions of a UI kit coexist on one page: each build registers its
own tags with its own postfix while application code stays the same. A single
class can be registered under one tag only — that is a `customElements` rule, so
different versions have to be different builds.

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

**The effect tree.** A nested effect is a child of the one whose run created it.
Before every restart the parent destroys its children, and on destruction it takes
the whole subtree with it. That is why a `dynamic` inside an `each` inside a
component cleans up at every level.

**Lists.** `each` matches old and new entries by key and then fixes the order,
moving only the nodes that are genuinely out of place: the positions that already
form the correct relative order are found as the longest increasing subsequence.
