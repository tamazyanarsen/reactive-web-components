export * from "./types/";
export * from "./utils/";

import pkg from "../../package.json";

console.log(
  "%cRWC v%s",
  "color: #fff; background:#4b7df5; padding:2px 6px; border-radius:4px;",
  pkg.version,
);
