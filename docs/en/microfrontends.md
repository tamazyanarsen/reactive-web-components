# UI kit versions in microfrontends

[Русский](../ru/microfrontends.md) · [Guide](./guide.md) · [Recipes](./recipes.md)

A platform of independently deployed modules usually shares one UI kit. With web
components this hits a hard limit: tag names are global. Once `<ui-button>` is defined,
a second `customElements.define("ui-button", ...)` throws. So the whole platform is pinned
to a single kit version, and upgrading the kit means a coordinated release of every module.

rwc removes that limit without changing module code: a component is declared once and
registered under a tag chosen by whoever loads it, and markup refers to the component
through a factory, not through a tag name.

<Demo name="kit-versions" />

The [live demo](https://tamazyanarsen.github.io/reactive-web-components/microfrontends)
loads two real builds of [`@rwcjs/ui`](../../packages/ui/README.md) on one page: 0.1.0
from npm and the current one from the repository. Both modules are built by the same
function; only the kit object passed to it differs.

## How it works

The kit declares components and exports factories together with a registration function:

```ts
// @acme/ui-kit
import { configCustomComponent } from "@rwcjs/core";

export const [UiButton, registerUiButton] = configCustomComponent(Button, "ui-button");
export const [UiModal, registerUiModal] = configCustomComponent(Modal, "ui-modal");

export const registerAll = (options?: { postfix?: string }) => {
  registerUiButton(options);
  registerUiModal(options);
};
```

Each module registers the kit version it was built with:

```ts
// billing, still on kit 1.7
import { registerAll, UiButton } from "@acme/ui-kit-1.7";
registerAll({ postfix: "v1-7" });   // <ui-button-v1-7>, <ui-modal-v1-7>

// profile, already on kit 1.8
import { registerAll, UiButton } from "@acme/ui-kit-1.8";
registerAll({ postfix: "v1-8" });   // <ui-button-v1-8>, <ui-modal-v1-8>
```

Module code is the same in both, because it calls the factory:

```ts
UiButton({ ".variant": "primary", "@click": save }, "Save");
```

Modules move to a new kit one at a time, and a module on 1.8 can be rendered inside a
module on 1.7: each component creates its children through its own kit's factories.

## Choose the postfix by kit version, not by module

`customElements` allows one class to be registered under one tag only. If two modules
share one copy of the kit (for example, a Module Federation singleton) and register it
with different postfixes, the second call cannot create a second tag: rwc keeps the first
one and logs an error.

Name the postfix after the kit version instead. Modules on the same version then share one
set of tags, repeated `registerAll({ postfix: "v1-8" })` calls are no-ops, and the tag in the
DOM tells you which kit version rendered it.

The host application can keep the newest kit without a postfix, so its markup uses the
plain names.

## Rules for kit authors

A kit stays version-safe when nothing inside it depends on the exact tag name:

- **Compose through factories.** A dialog that renders a button calls `UiButton(...)`,
  never `document.createElement("ui-button")`.
- **Find children by class, not by tag.** Filter slotted elements with
  `el instanceof Tab`, not with `el.localName === "ui-tab"` or `querySelector("ui-tab")`.
- **Prefix generated ids with the tag.** Each copy of the kit has its own id counter that
  starts from zero, so `ui-tab-1` would appear twice on the page. Use
  `` `${this.localName}-${++counter}` `` — the tag already carries the postfix.
  `@rwcjs/ui` does this for tabs and tooltips.
- **Style the host with `:host`, not with a tag selector.** Inside the component
  `ui-button { ... }` does not match `ui-button-v1-8`.
- **Read the tag from the class when you need it.** After registration
  `Component.renderTagName` holds the actual tag; `toast()` in `@rwcjs/ui` uses it to
  create the toaster.

## Rules for module authors

- Do not write tag names in CSS or tests. Style components through their CSS variables,
  `::part()` and classes on the host; find them in tests by role or `data-testid`.
- Theme variables (`--rwc-*` in `@rwcjs/ui`) are inherited by every kit version on the
  page. That keeps the brand consistent, but a kit release that renames a variable has to
  keep the old name until the last module upgrades.
- Several kit builds can share one copy of `@rwcjs/core`; the kit's `peerDependencies`
  range decides which core versions it accepts.

## Compared to scoped custom element registries

[Scoped custom element registries](https://developer.chrome.com/blog/scoped-registries)
are the platform's answer to the same problem: a shadow root gets its own registry, and
the same tag can mean different classes in different parts of the page. They ship in
Chrome and Edge 146 and Safari 26, but not yet in Firefox without a flag
([caniuse](https://caniuse.com/wf-scoped-custom-element-registries)).

| | rwc postfixes | Scoped registries |
| --- | --- | --- |
| Browsers | Everywhere custom elements work | Chrome/Edge 146+, Safari 26+; Firefox behind a flag |
| Where versions can be mixed | Anywhere, including light DOM | Inside shadow roots with their own registry |
| Tag in the DOM | Differs per version (`ui-button-v1-8`) | Same tag, different class |
| Code that creates elements | Factories, unchanged | Must create elements in the right registry |

The two approaches do not conflict. When scoped registries reach every browser your
platform supports, the registration step can move to them, and module code that only
calls factories will not need to change.
