# rwc app

Created with `npm create @rwcjs`.

```bash
npm install
npm run dev       # dev server
npm run build     # type check and production build into dist/
npm run preview   # serve the production build
```

- `src/main.ts`: the router and the layout.
- `src/counter.ts`: a web component with props, an event and styles.
- `src/pages/`: pages; `contact.ts` shows a form with validation.

Docs: [guide](https://github.com/tamazyanarsen/reactive-web-components/blob/main/docs/en/guide.md),
[router](https://github.com/tamazyanarsen/reactive-web-components/tree/main/packages/router),
[forms](https://github.com/tamazyanarsen/reactive-web-components/tree/main/packages/forms).

With history routing, the production server must answer every route with `index.html`.
