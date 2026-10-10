# @rwcjs/create

Scaffolds a project on [`@rwcjs/core`](https://github.com/tamazyanarsen/reactive-web-components#readme).

```bash
npm create @rwcjs@latest my-app
# or
pnpm create @rwcjs my-app
bun create @rwcjs my-app
```

Choose a template interactively, or pass it:

```bash
npm create @rwcjs@latest my-app -- --template app
npm create @rwcjs@latest my-lib -- --template library
```

| Template | What you get |
| --- | --- |
| `app` | A Vite application with `@rwcjs/router`, a page with a form on `@rwcjs/forms`, and an example web component. |
| `library` | A Vite library build of web components, declared with `configCustomComponent` so apps register them, type declarations, and a Custom Elements Manifest from `@rwcjs/cem-plugin`. |

`--yes` skips the questions and takes the defaults (`rwc-app`, `app`).
