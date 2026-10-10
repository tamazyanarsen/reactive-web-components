# @rwcjs/ui

A UI kit of accessible web components on [`@rwcjs/core`](https://github.com/tamazyanarsen/reactive-web-components#readme).
Neutral by default, themed with CSS custom properties, light and dark out of the box.

[Live gallery](https://tamazyanarsen.github.io/reactive-web-components/ui-gallery)

```bash
npm install @rwcjs/core @rwcjs/ui
```

```ts
import { registerAll, rwcButton, toast } from "@rwcjs/ui";
import "@rwcjs/ui/theme.css"; // optional: theme variables and a manual dark mode switch

registerAll();

document.body.append(
  rwcButton({ ".variant": "primary", "@press": () => toast("Saved") }, "Save"),
);
```

The components are standard custom elements, so they also work straight from HTML and
from any framework once registered:

```html
<rwc-button variant="primary">Save</rwc-button>
<rwc-input name="email" type="email" required></rwc-input>
```

## Components

**Forms.** All of them are form-associated: they take part in `<form>`, `FormData`,
validation, reset and `<fieldset disabled>`, like native controls.

| Tag | What it is |
| --- | --- |
| `rwc-button` | Button with `primary`, `secondary`, `ghost`, `danger` variants, sizes, `loading`; `type="submit"`/`"reset"` acts on its form. |
| `rwc-input` | Text field around a native `<input>` (text, email, password, search, tel, url, number); `input`/`change` events; required, email and minlength validation. |
| `rwc-textarea` | Multi-line text field with `rows`; same events and validation as `rwc-input`. |
| `rwc-checkbox` | Checkbox with the label in the default slot; `indeterminate` (announced as "mixed"); `change` carries a boolean. |
| `rwc-switch` | On/off toggle with `role="switch"`; `change` carries a boolean. |
| `rwc-select` | Single choice from an `options` prop, rendered into a native `<select>`; placeholder, required. |
| `rwc-radio-group` | Radio group from an `options` prop, vertical or horizontal; one Tab stop, arrow keys move and select. |

**Overlays.**

| Tag | What it is |
| --- | --- |
| `rwc-dialog` | Modal dialog on a native `<dialog>` with `header`, body and `footer` slots; closes on Escape or a backdrop click and reports why; returns focus on close. |
| `rwc-tooltip` | Hover and focus tooltip with a delay and four placements; Escape dismisses it; the description is exposed on the trigger itself. |
| `rwc-popover` | Click-to-open panel next to a slotted trigger; closes on Escape, a click outside or focus leaving; manages focus and `aria-expanded`. |
| `rwc-dropdown-menu` | Menu button following WAI-ARIA: items from a prop, arrow keys, Home/End, type-to-search; `select` carries the item value. |

Popover and dropdown menu use the top layer with CSS anchor positioning where the
browser supports both, and fall back to a panel positioned next to the trigger.

**Structure.**

| Tag | What it is |
| --- | --- |
| `rwc-tabs`, `rwc-tab`, `rwc-tab-panel` | Tabs following WAI-ARIA: roving focus, arrows, Home/End, `activation` `auto` or `manual`, horizontal or vertical; `tab-change` carries the value. |
| `rwc-accordion`, `rwc-accordion-item` | Collapsible sections; one open at a time or `multiple`; arrow keys move between headers; `toggle` carries `{ value, open }`. |
| `rwc-card` | Container with `header`, default and `footer` slots: `outlined`, `elevated` or `filled`. |
| `rwc-badge` | Small label: `neutral`, `accent`, `success`, `warning`, `danger`. |
| `rwc-avatar` | Picture with a fallback to initials from `name`; circle or square, three sizes. |
| `rwc-divider` | `role="separator"` line, horizontal or vertical, with an optional label. |

**Feedback.**

| Tag | What it is |
| --- | --- |
| `rwc-toaster`, `rwc-toast` | Notifications from `toast("Saved")` or `toast({ title, description, variant, duration, action, id })`; auto-dismiss that pauses on hover and focus; `dismissToast(id?)`. |
| `rwc-alert` | Inline message: `info`, `success`, `warning`, `danger`; optional `dismissible`. |
| `rwc-spinner` | Indeterminate loading indicator with `role="status"`. |
| `rwc-progress` | Progress bar; `value` of `null` or a negative number means unknown progress. |
| `rwc-skeleton` | Placeholder block: `text` with `lines`, `rect` or `circle`. |

Every component's props, events and slots are listed in `custom-elements.json` in the
package, which editors and Storybook read.

## Registration

The kit declares components but does not register them. Call `registerAll()` once, or
register only what you use: `registerButton()`, `registerDialog()`, `registerTabs()`...
Factories such as `rwcButton(...)` work only after registration.

A postfix lets two versions of the kit live on one page, while the factory calls in your
code stay the same:

```ts
registerAll({ postfix: "v2" }); // <rwc-button-v2>, <rwc-dialog-v2>, ...
```

## Theming

Components read public `--rwc-*` variables and fall back to built-in values for the light
and dark schemes, which follow `prefers-color-scheme`. To restyle the kit, set a few
variables on `:root` or any ancestor:

```css
:root {
  --rwc-accent: #0f766e;
  --rwc-accent-hover: #115e59;
  --rwc-radius: 12px;
  --rwc-font: "Inter", sans-serif;
}
```

`@rwcjs/ui/theme.css` defines every variable for both schemes and adds a manual switch:
`<html data-theme="dark">` or `data-theme="light"`. Copy it into your project to build
your own brand.

| Variable | Meaning |
| --- | --- |
| `--rwc-accent`, `--rwc-accent-hover`, `--rwc-accent-contrast` | Primary color, its hover state, text on it |
| `--rwc-danger`, `--rwc-success`, `--rwc-warning` | Status colors |
| `--rwc-surface`, `--rwc-surface-muted` | Backgrounds |
| `--rwc-text`, `--rwc-text-muted` | Text colors |
| `--rwc-border`, `--rwc-overlay`, `--rwc-shadow` | Borders, modal backdrop, elevation |
| `--rwc-radius`, `--rwc-radius-sm`, `--rwc-space` | Shape and spacing |
| `--rwc-font`, `--rwc-font-size`, `--rwc-control-height` | Typography and control size |
| `--rwc-focus-ring`, `--rwc-duration` | Focus ring and animation speed (0 under reduced motion) |

Reflected props become host attributes, so you can also style from outside:
`rwc-button[variant="primary"] { ... }`. Some components expose `part`s for deeper
styling, for example `rwc-tabs::part(tablist)`.

## Forms

Form controls work with a plain `<form>`:

```ts
form(
  { "@submit": (event) => console.log(new FormData(event.currentTarget)) },
  rwcInput({ attrs: { name: "email" }, ".type": "email", ".required": true }),
  rwcCheckbox({ attrs: { name: "terms" }, ".required": true }, "I accept the terms"),
  rwcButton({ ".type": "submit", ".variant": "primary" }, "Sign up"),
);
```

With [`@rwcjs/forms`](https://github.com/tamazyanarsen/reactive-web-components/tree/main/packages/forms#readme),
bind a field to a control through its `value` (or `checked`) prop and its events:

```ts
const email = signUp.field("email");
rwcInput({ ".value": email.value, "@input": (event) => email.value.set(event.detail), "@blur": email.touch });
```

## Notes

- `rwc-tabs` emits `tab-change`, not `change`: native `change` events from fields inside
  panels bubble through the tabs element.
- Validation messages are English; localized messages are planned.
- Conventions for adding components are in [CONVENTIONS.md](https://github.com/tamazyanarsen/reactive-web-components/blob/main/packages/ui/CONVENTIONS.md).
