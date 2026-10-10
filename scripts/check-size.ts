// Бюджет размера: сколько библиотека весит в бандле потребителя — минифицированная
// и сжатая, как её отдаст сервер. dist/index.js публикуется без минификации ради
// читаемых стеков, поэтому меряем не его, а минифицированную сборку той же точки входа.
//
// Порог чуть выше текущего размера: рост на пару процентов пройдёт, раздувание — нет.
// Поднимать порог можно, но осознанно и в том же коммите, что и рост.
import { brotliCompressSync, gzipSync } from "node:zlib";

const BUDGET = { gzip: 9_200, brotli: 8_250 };

const result = await Bun.build({
  entrypoints: ["./index.ts"],
  target: "browser",
  format: "esm",
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const source = new Uint8Array(await result.outputs[0]!.arrayBuffer());
const sizes = {
  gzip: gzipSync(source, { level: 9 }).length,
  brotli: brotliCompressSync(source).length,
};

const kb = (bytes: number) => `${(bytes / 1024).toFixed(2)} KB`;
let failed = false;

console.log(`  минифицировано: ${kb(source.length)}`);
for (const kind of ["gzip", "brotli"] as const) {
  const ok = sizes[kind] <= BUDGET[kind];
  failed ||= !ok;
  console.log(`${ok ? "✓" : "✗"} ${kind}: ${kb(sizes[kind])} (лимит ${kb(BUDGET[kind])})`);
}

if (failed) process.exit(1);
