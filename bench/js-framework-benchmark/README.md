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

Status: submitted as [krausest/js-framework-benchmark#2121](https://github.com/krausest/js-framework-benchmark/pull/2121).
Before submitting, the smoke run, `isKeyed` and `checkCSP` passed locally.

## Submitting

Open a pull request to `krausest/js-framework-benchmark` that adds
`frameworks/keyed/rwc`. The `@rwcjs/core` version in `package.json` must be published
to npm, since the benchmark installs it from the registry.

## Local results

Measured on 2026-10-10 with the benchmark's own runner (Playwright, headless Chrome
154, 15 iterations per CPU test), on an AMD Ryzen 9 5900X with 32 GB of RAM. Values are
medians of the total duration in milliseconds; "CPU" is the geometric mean of the CPU
tests relative to vanillajs (lower is better). The official table is computed on the
maintainer's machine with weighted means, so absolute numbers will differ, but the order
between frameworks measured on one machine usually holds.

| Framework | create 1k | replace | update 10th | select | swap | remove | create 10k | append | clear | CPU | run memory, MB | gzip, KB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| vanillajs | 39.8 | 44.0 | 24.6 | 7.3 | 26.9 | 24.0 | 444.7 | 44.3 | 21.0 | 1.00 | 2.39 | 2.5 |
| solid 1.9.3 | 41.8 | 48.7 | 28.1 | 8.3 | 29.5 | 23.9 | 469.3 | 47.1 | 25.2 | 1.09 | 3.34 | 4.5 |
| svelte 5.42.1 | 42.6 | 48.7 | 28.3 | 10.9 | 30.3 | 24.6 | 477.5 | 47.5 | 23.8 | 1.13 | 3.53 | 9.7 |
| vue 3.5.39 | 48.2 | 54.8 | 27.5 | 8.7 | 29.7 | 26.1 | 544.6 | 52.4 | 29.5 | 1.19 | 4.57 | 23.3 |
| lit 3.2.0 | 46.5 | 52.7 | 29.7 | 10.1 | 36.3 | 25.3 | 518.8 | 53.0 | 31.1 | 1.24 | 3.46 | 7.3 |
| preact-signals 11.0.0 | 53.6 | 62.6 | 26.8 | 9.9 | 32.5 | 25.0 | 602.1 | 57.7 | 35.4 | 1.30 | 5.56 | 8.3 |
| **rwc 3.2.0** | 57.5 | 72.4 | 27.7 | 8.5 | 37.0 | 26.4 | 637.5 | 65.6 | 41.2 | **1.39** | 5.83 | 4.4 |
| angular 22.2.0 | 66.1 | 73.4 | 44.1 | 10.7 | 44.9 | 32.3 | 626.1 | 67.3 | 40.4 | 1.60 | 5.26 | 45.5 |
| react 19.2.0 | 49.0 | 59.5 | 32.5 | 11.3 | 202.2 | 26.0 | 768.4 | 55.3 | 38.4 | 1.68 | 5.09 | 51.4 |

What it says about rwc 3.2.0:

- **Updates are on par with the fastest.** Update every 10th row, select and remove are
  within a few percent of Solid, thanks to per-row signals and `createSelector`.
- **Creation and clearing are the weak spot**: 1.4–2× vanillajs on create, replace,
  append and clear. Every row costs an effect scope, two signals, an anchor comment and
  several effects, each with its own `Set`s, and clearing disposes and removes rows one
  by one. Memory per row is high for the same reason.
- **The bundle is the second smallest** after vanillajs: 4.4 KB gzip.

## What the implementation shows

- **Create rows**: tag factories build the DOM directly, with no template parsing.
- **Update every 10th row**: each row label is its own signal, so only 100 text nodes
  change and the list itself is not diffed.
- **Swap rows**: the keyed `each` moves only the two swapped rows (longest increasing
  subsequence).
- **Select row**: `createSelector` gives each row its own source, so selecting wakes
  two rows (the old and the new one) instead of all of them.
