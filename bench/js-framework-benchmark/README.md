# rwc in js-framework-benchmark

The keyed implementation of [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark)
for `@rwcjs/core`. The markup, ids and button texts follow the benchmark rules, so do not
change them.

## Running locally

```bash
git clone https://github.com/krausest/js-framework-benchmark
cd js-framework-benchmark
npm ci && npm run install-local

cp -r <rwc>/bench/js-framework-benchmark frameworks/keyed/rwc
cd frameworks/keyed/rwc && npm install && npm run build-prod && cd ../../..

npm start                                   # server on :8080
npm run bench -- --framework keyed/rwc keyed/solid keyed/lit keyed/vanillajs
npm run results                             # table in webdriver-ts-results/
```

Compare against `vanillajs` (the floor), `solid` (the closest model: signals, no
virtual DOM), and `lit` (the closest web-component library).

## Submitting

Open a pull request to `krausest/js-framework-benchmark` that adds
`frameworks/keyed/rwc`. The `@rwcjs/core` version in `package.json` must be published
to npm, since the benchmark installs it from the registry.

## What the implementation shows

- **Create rows**: tag factories build the DOM directly, with no template parsing.
- **Update every 10th row**: each row label is its own signal, so only 100 text nodes
  change and the list itself is not diffed.
- **Swap rows**: the keyed `each` moves only the two swapped rows (longest increasing
  subsequence).
- **Select row**: `createSelector` gives each row its own source, so selecting wakes
  two rows (the old and the new one) instead of all of them.
