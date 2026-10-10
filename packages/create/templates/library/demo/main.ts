import { createRoot, div, p, signal } from "@rwcjs/core";
import { registerAll, uiButton } from "../src";

registerAll();

const presses = signal(0);

document.getElementById("app")!.append(
  createRoot(() =>
    div(
      uiButton({ ".variant": "primary", "@press": () => presses.update((n) => n + 1) }, "Primary"),
      " ",
      uiButton({ ".disabled": true }, "Disabled"),
      p(() => `Pressed ${presses()} times`),
    ),
  ),
);
