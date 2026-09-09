await Bun.$`rm -rf dist`;
const buildResult = await Bun.build({
  entrypoints: ["./index.ts"],
  outdir: "./dist",
  target: "browser",
  minify: true,
});
console.log(buildResult);
