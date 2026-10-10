# @rwcjs/router

A router for [`@rwcjs/core`](https://github.com/tamazyanarsen/reactive-web-components#readme)
built on signals.

- **Typed params from the path string.** `"/users/:id"` gives `params().id: string`, and
  `"/posts/:page?"` gives `page?: string`, with no separate type declarations.
- **Pages survive param changes.** Going from `/users/1` to `/users/2` does not recreate
  the page: the same route matched, so only the `params` signal changes.
- **Specificity wins, not order.** `/users/new` beats `/users/:id`, and `*` is the last
  resort, wherever they are declared.
- History API or hash mode, `base` prefix, links with an active state, and a URL option
  for server rendering.

```bash
npm install @rwcjs/core @rwcjs/router
```

## Usage

```ts
import { createRoot, div, nav, span } from "@rwcjs/core";
import { createRouter } from "@rwcjs/router";

const router = createRouter({
  "/": () => span("Home"),
  "/users/:id": ({ params }) => userPage({ ".id": () => params().id }),
  "/search": ({ query }) => span(() => `Results for ${query().get("q") ?? ""}`),
  "*": () => span("Not found"),
});

document.body.append(
  createRoot(() =>
    div(
      nav(
        router.link({ to: "/" }, "Home"),
        router.link({ to: "/users/1" }, "Ann"),
      ),
      router.view(),
    ),
  ),
);
```

## API

### `createRouter(routes, options?)`

`routes` maps a path pattern to a render function. The render function receives
`{ params, query }`, both signals, and returns markup.

| Pattern | Matches | `params()` |
| --- | --- | --- |
| `/users/new` | exactly `/users/new` | `{}` |
| `/users/:id` | `/users/42` | `{ id: "42" }` |
| `/posts/:page?` | `/posts` and `/posts/3` | `{}` / `{ page: "3" }` |
| `/files/*` | `/files/a/b.txt` | `{ rest: "a/b.txt" }` |

Params are URL-decoded. Options:

- `mode`: `"history"` (default) or `"hash"`. Hash mode needs no server configuration.
- `base`: an application prefix, for example `"/app"`.
- `url`: the initial URL when there is no `window` (server rendering) or when the
  router should not touch the address bar (tests).

### Router members

| Member | What it is |
| --- | --- |
| `view()` | Where the current page renders. It rebuilds only when the matched route changes. |
| `link({ to, activeClass?, exact? }, ...children)` | An `<a>` that navigates without reloading. It gets `activeClass` (default `"active"`) and `aria-current="page"` while its path is current, including nested paths unless `exact`. Clicks with modifier keys, `target` or `download` are left to the browser. Accepts the usual element config. |
| `navigate(to, { replace? })` | Navigates inside the application: `"/users/1?tab=posts"`. |
| `path()` | The current path, without `base` and query. |
| `query()` | `URLSearchParams` of the current URL. |
| `route()` | The matched pattern, or `null`. |
| `params()` | The params of the matched route. |
| `dispose()` | Removes the history listeners. |

### `ParamsOf<Path>`

The params type for a pattern, in case you need it outside the route:

```ts
type UserParams = ParamsOf<"/users/:id">; // { id: string }
```

## Notes

- `link` and `view` create effects, so call them inside a component's `render()` or
  inside `createRoot`. The effects then die together with their owner.
- With history mode, the server must answer every application path with the same
  `index.html`. Hash mode avoids that.
