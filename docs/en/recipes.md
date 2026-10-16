# Recipes

[Русский](../ru/recipes.md) · [Guide](./guide.md) · [API reference](./api.md) · [Frameworks](./frameworks.md) · [SSR](./ssr.md)

- [An input field with validation](#an-input-field-with-validation)
- [A form-associated input](#a-form-associated-input)
- [Search with debounce and cancellation](#search-with-debounce-and-cancellation)
- [Theming through context](#theming-through-context)
- [A table with a row template](#a-table-with-a-row-template)
- [A timer that cleans up after itself](#a-timer-that-cleans-up-after-itself)
- [Two versions of a UI kit on one page](#two-versions-of-a-ui-kit-on-one-page)
- [Testing a component](#testing-a-component)
- [Choosing between when, show and dynamic](#choosing-between-when-show-and-dynamic)

## An input field with validation

The error is a derived value rather than separate state, so there is nothing to
fall out of sync.

```ts
class EmailField extends defineComponent({
  props: { value: "", touched: false },
  events: { valueChange: payload<string>() },
  styles: css`
    :host { display: block }
    .error { color: #c00; font-size: 0.85em }
    input.invalid { border-color: #c00 }
  `,
}) {
  render() {
    const { value, touched } = this.props;

    const error = computed(() => {
      if (!value()) return "email is required";
      if (!value().includes("@")) return "an @ sign is missing";
      return null;
    });

    // Show the error only after the field has been touched.
    const visibleError = computed(() => (touched() ? error() : null));

    return label(
      {},
      "Email",
      input({
        ".value": value,
        ".type": "email",
        class: ["field", { invalid: () => visibleError() !== null }],
        attrs: { "aria-invalid": () => visibleError() !== null },
        "@input": (event) => {
          value.set(event.currentTarget.value);
          this.events.valueChange(event.currentTarget.value);
        },
        "@blur": () => touched.set(true),
      }),
      when(visibleError, () => span(cls`error`, visibleError)),
    );
  }
}
```

## A form-associated input

With `form: true` the component behaves like a native field: its value goes into
`FormData`, `required` blocks submission, and the form's reset button clears it.

```ts
class TextField extends defineComponent({
  props: { value: "", required: false },
  form: true,
  reflect: ["required"],
  styles: css`
    :host { display: inline-block }
    :host(:invalid) input { border-color: #c00 }
  `,
}) {
  render() {
    const { value, required } = this.props;

    // FormData follows the signal: no manual sync on every keystroke.
    this.setFormValue(value);

    const field = input({
      ".value": value,
      ".disabled": this.formDisabled,
      "@input": (event) => value.set(event.currentTarget.value),
    });

    // onMount: the third argument of setValidity must already be in the shadow root,
    // and inside render() the markup is not attached yet — the browser would throw.
    onMount(() => {
      this.addEffect(() => {
        if (required() && !value()) {
          // The third argument is where the browser points the validation bubble.
          this.internals.setValidity({ valueMissing: true }, "Please fill in this field", field);
        } else {
          this.internals.setValidity({});
        }
      });
    });

    return field;
  }
}

export const textField = useCustomComponent(TextField, "x-text-field");
```

In a form it is used like any input; the field name comes from the usual `name`
attribute:

```ts
const signup = form(
  {
    "@submit": (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      console.log(data.get("email"));
    },
  },
  textField({ attrs: { name: "email", required: true } }),
  button({ ".type": "submit" }, "Sign up"),
  button({ ".type": "reset" }, "Clear"),
);
```

Reset returns every prop to its initial value — that is the default `formReset()`.
A `disabled` `fieldset` around the component flips `this.formDisabled`.

## Search with debounce and cancellation

`resource` takes care of cancelling the stale request; the debounce stays in an
effect.

```ts
class Search extends defineComponent({ props: { minLength: 2 } }) {
  render() {
    const typed = signal("");
    const query = signal("");

    // Debounce: the timer lives in an effect, onCleanup clears it on every keystroke.
    effect(() => {
      const next = typed();
      const timer = setTimeout(() => query.set(next), 300);
      onCleanup(() => clearTimeout(timer));
    });

    const found = resource(
      async (abort) => {
        const text = query();
        if (text.length < this.props.minLength()) return [];
        const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`, { signal: abort });
        return (await response.json()) as Person[];
      },
      { initialValue: [] },
    );

    return div(
      {},
      input({
        ".value": typed,
        "@input": (event) => typed.set(event.currentTarget.value),
        attrs: { placeholder: "who are we looking for" },
      }),
      // The spinner does not flicker on every character: loading rises only on a real request.
      span({ show: found.loading }, "searching…"),
      when(found.error, () => span(cls`error`, "failed")),
      ul(
        {},
        each(
          () => found.data() ?? [],
          (person) => li({}, () => person().name),
          (person) => person.id,
        ),
      ),
    );
  }
}
```

Why two variables: `typed` changes on every keystroke, `query` once every 300 ms.
The dependency of `resource` is `query`, so exactly one request goes out.

## Theming through context

```ts
// theme.ts
export type Theme = "light" | "dark";
export const ThemeKey = createContext<Theme>("theme", "light");
```

The provider hands over a signal, so switching reaches every consumer at once:

```ts
class App extends defineComponent({ props: {} }) {
  render() {
    const theme = signal<Theme>("light");
    this.provide(ThemeKey, theme);

    return div(
      {},
      button({ "@click": () => theme.update((t) => (t === "light" ? "dark" : "light")) }, "theme"),
      toolbar(),
      content(),
    );
  }
}
```

A consumer at any depth, across any number of shadow roots:

```ts
class Toolbar extends defineComponent({ props: {} }) {
  static override styles = css`
    :host { background: var(--bg) }
    :host(.dark) { --bg: #222 }
  `;

  render() {
    const theme = this.inject(ThemeKey);
    // The class goes on the host: it lives in the light DOM, so both :host(.dark) and the page can see it.
    applyClass(this, { dark: () => theme() === "dark" });
    return div({}, slot());
  }
}
```

Declare the value in the provider's `render()` or earlier: descendants read the
context when they connect to the DOM.

## A table with a row template

The component owns the layout and the state; the caller supplies the row markup.

```ts
type Row = { id: number; name: string; total: number };

class DataTable extends defineComponent({
  props: { rows: [] as Row[] },
  slots: {
    row: payload<{ row: ReadonlySignal<Row>; index: ReadonlySignal<number> }>(),
    empty: payload<void>(),
  },
  styles: css`
    table { border-collapse: collapse; width: 100% }
    :host { display: block }
  `,
}) {
  render() {
    return when(
      () => this.props.rows().length > 0,
      () =>
        table(
          {},
          each(
            this.props.rows,
            (row, index) => this.renderSlot("row", { row, index }, () => tr({}, td(() => row().name))),
            (row) => row.id,
          ),
        ),
      () => this.renderSlot("empty", undefined, () => p("empty")),
    );
  }
}

export const dataTable = useCustomComponent(DataTable, "x-data-table");
```

In use — the row context is typed:

```ts
dataTable({
  ".rows": rows,
  "#row": ({ row, index }) =>
    tr(
      { class: { odd: () => index() % 2 === 1 } },
      td(() => row().name),
      td(() => row().total.toLocaleString("en-US")),
    ),
  "#empty": () => p("nothing found"),
});
```

Rows are reused by `id`: sorting moves the nodes, while changing a total only
updates the text of that cell.

## A timer that cleans up after itself

```ts
class Stopwatch extends defineComponent({
  props: { running: false },
  events: { tick: payload<number>() },
}) {
  render() {
    const elapsed = signal(0);

    effect(() => {
      // Read the condition first — that is what the effect subscribes to.
      if (!this.props.running()) return;

      const started = Date.now() - elapsed.peek();
      const id = setInterval(() => elapsed.set(Date.now() - started), 50);
      onCleanup(() => clearInterval(id));
    });

    return div({}, () => (elapsed() / 1000).toFixed(1), " s");
  }
}
```

`onCleanup` clears the timer both on pause and when the component disconnects.
`elapsed.peek()` rather than `elapsed()` — otherwise the effect would subscribe to
the very signal it writes to and loop.

## Two versions of a UI kit on one page

Declare kit components with `configCustomComponent`, register them with a postfix named
after the kit version, and call factories in module code:

```ts
import { registerAll, UiButton } from "@acme/ui-kit-1.8";
registerAll({ postfix: "v1-8" });          // <ui-button-v1-8>
UiButton({ ".variant": "primary" }, "Save"); // the same call in every module
```

The full setup, rules for kit authors and a comparison with scoped custom element
registries are on a separate page: [UI kit versions in microfrontends](./microfrontends.md).

## Testing a component

Tags are registered globally and forever, so give every component its own name in
tests.

```ts
import { afterEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

let counter = 0;
const nextTag = () => `test-counter-${counter++}` as const;

test("the button increments the counter and emits an event", async () => {
  const counterFactory = useCustomComponent(Counter, nextTag());

  const seen: number[] = [];
  const element = counterFactory({ ".value": 1, "@change": (e) => seen.push(e.detail) });
  document.body.append(element);

  // The shadow root is open by default, so the test can reach inside.
  const [minus, plus] = element.shadowRoot!.querySelectorAll("button");
  plus!.dispatchEvent(new Event("click"));

  expect(element.shadowRoot!.textContent).toContain("2");
  expect(seen).toEqual([2]);

  element.remove();
  // Teardown is deferred to a microtask, in case the element is just being moved.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(element.shadowRoot!.textContent).toBe(""); // effects destroyed, markup cleared
});
```

Reactivity is synchronous: after `dispatchEvent` and after `signal.set` the markup
is already updated, no microtasks to await. There are two exceptions. `resource`:
its response arrives through a promise. And disconnection: after `remove()` the
component is torn down on a microtask, so await before checking it.

## Choosing between when, show and dynamic

| | What it does | When to use |
| --- | --- | --- |
| `when` | rebuilds the branch when the condition's truthiness changes, destroys the removed one | the content should really disappear: a modal, a tab, an empty state |
| `show` | hides through `display`, the DOM and effects stay alive | toggling is frequent and the content is expensive to rebuild or holds state (scroll position, input) |
| `dynamic` | rebuilds the content when any signal read inside changes | the structure of the markup changes, not just a value |

When a single value changes, none of them is needed: a reactive child, attribute
or class updates exactly its own node.

```ts
span(() => user().name);           // like this
dynamic(() => span(user().name));   // not like this: rebuilds the node on every change
```
