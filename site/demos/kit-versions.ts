// Две версии @rwcjs/ui на одной странице: опубликованная 0.1.0 из npm и текущая из
// исходников репозитория. Это две настоящие сборки кита с разными классами, а код
// модулей, который их вызывает, один и тот же — функция module() ниже.
import { code, div, h3, p, signal, span } from "@rwcjs/core";
import * as kitNext from "@rwcjs/ui";
import * as kitOld from "rwc-ui-0-1";

// Оболочка — на текущем ките, «старый» модуль ещё не переехал с 0.1.0.
kitNext.registerAll();
kitOld.registerAll({ postfix: "v0-1" });

type Kit = Pick<typeof kitNext, "rwcButton" | "rwcSwitch" | "rwcBadge" | "rwcTooltip">;

const module = (title: string, version: string, kit: Kit) => {
  const clicks = signal(0);
  const save = kit.rwcButton({ ".variant": "primary", "@press": () => clicks.update((n) => n + 1) }, "Save");
  const notify = kit.rwcSwitch("Notifications");

  return div(
    { style: { display: "grid", gap: "12px", padding: "16px", border: "1px solid var(--vp-c-divider)", borderRadius: "8px" } },
    h3({ style: { margin: "0" } }, title, " ", kit.rwcBadge({ ".variant": "accent" }, version)),
    div(
      { style: { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" } },
      kit.rwcTooltip({ ".content": "Saves the form" }, save),
      notify,
      span(() => `clicks: ${clicks()}`),
    ),
    p({ style: { margin: "0", fontSize: "13px" } }, "Rendered as ", code(`<${save.localName}>`), " and ", code(`<${notify.localName}>`)),
  );
};

export default () =>
  div(
    { attrs: { "data-demo": "kit-versions" }, style: { display: "grid", gap: "16px" } },
    module("Shell", "kit (current)", kitNext),
    // В настоящей платформе каждый модуль импортирует свой кит, и общей функции на две
    // версии нет. Здесь она общая ради наглядности, а типы версий номинально разные
    // (private-поля классов), отсюда приведение.
    module("Legacy module", "kit 0.1.0", kitOld as unknown as Kit),
    p(
      { style: { margin: "0", fontSize: "13px" } },
      "Different classes on one page: ",
      code(String(kitOld.Button !== kitNext.Button)),
    ),
  );
