import { describe, expect, test } from "bun:test";
import { button, div, h2, type CustomElementOptions } from "@rwcjs/core";
import { click, mount, press, registerFresh, shadow, tick } from "../test-utils";
import { registerDialog, rwcDialog, type Dialog, type DialogCloseReason } from "./dialog";

registerFresh(registerDialog);

const native = (element: Dialog) => shadow(element).querySelector("dialog")!;

/** Диалог с записью событий. */
const setup = (config: CustomElementOptions<Dialog> = {}, ...children: Node[]) => {
  const log: string[] = [];
  const element = mount(
    rwcDialog(
      {
        "@open": () => log.push("open"),
        "@close": (event) => log.push(`close:${event.detail satisfies DialogCloseReason}`),
        ...config,
      },
      ...children,
    ),
  );
  return { element, log };
};

describe("rwc-dialog", () => {
  test("рендерит нативный <dialog> со слотами и закрыт по умолчанию", () => {
    const { element } = setup({}, div("Тело"));
    expect(native(element)).not.toBeNull();
    expect(native(element).open).toBe(false);
    const names = [...shadow(element).querySelectorAll("slot")].map((slot) => slot.name);
    expect(names).toEqual(["header", "", "footer"]);
  });

  test("label даёт aria-label, без него имя берётся из слота header", () => {
    const labelled = setup({ ".label": "Удалить файл?" }).element;
    expect(native(labelled).getAttribute("aria-label")).toBe("Удалить файл?");
    expect(native(labelled).hasAttribute("aria-labelledby")).toBe(false);

    const headed = setup({}, h2({ attrs: { slot: "header" } }, "Заголовок")).element;
    expect(native(headed).hasAttribute("aria-label")).toBe(false);
    expect(native(headed).getAttribute("aria-labelledby")).toBe("header");
    expect(shadow(headed).getElementById("header")).not.toBeNull();
  });

  test("open открывает модально, отражается в атрибут и шлёт open", async () => {
    const { element, log } = setup();
    element.open = true;
    expect(native(element).open).toBe(true);
    expect(native(element).getAttribute("aria-modal")).toBe("true");
    expect(element.hasAttribute("open")).toBe(true);
    expect(log).toEqual(["open"]);
  });

  test("открытый с самого начала диалог открывается после вставки в документ", async () => {
    const { element, log } = setup({ ".open": true });
    await tick();
    expect(native(element).open).toBe(true);
    expect(log).toEqual(["open"]);
  });

  test("Escape закрывает с причиной escape и сбрасывает open", () => {
    const { element, log } = setup();
    element.show();
    press(native(element), "Escape");
    expect(element.open).toBe(false);
    expect(native(element).open).toBe(false);
    expect(element.hasAttribute("open")).toBe(false);
    expect(log.at(-1)).toBe("close:escape");
  });

  test("событие cancel (закрывающий жест браузера) — тоже escape", () => {
    const { element, log } = setup();
    element.show();
    native(element).dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(element.open).toBe(false);
    expect(log.at(-1)).toBe("close:escape");
  });

  test("клик по подложке закрывает, по содержимому — нет", () => {
    const { element, log } = setup();
    element.show();

    click(shadow(element).querySelector(".panel")!);
    expect(element.open).toBe(true);

    click(native(element));
    expect(element.open).toBe(false);
    expect(log).toEqual(["open", "close:backdrop"]);
  });

  test("closeOnBackdrop=false не закрывает по подложке", () => {
    const { element } = setup({ ".closeOnBackdrop": false });
    element.show();
    click(native(element));
    expect(element.open).toBe(true);
  });

  test("нажатие, начатое внутри и отпущенное на подложке, не закрывает", () => {
    const { element } = setup();
    element.show();
    shadow(element).querySelector(".panel")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    click(native(element));
    expect(element.open).toBe(true);
  });

  test("закрытие через пропс и hide() — причина api", () => {
    const { element, log } = setup();
    element.show();
    element.open = false;
    element.show();
    element.hide();
    expect(log).toEqual(["open", "close:api", "open", "close:api"]);
    expect(native(element).open).toBe(false);
  });

  test("закрытие в обход компонента (dialog.close()) догоняет пропс", () => {
    const { element, log } = setup();
    element.show();
    native(element).close();
    expect(element.open).toBe(false);
    expect(log.at(-1)).toBe("close:api");
  });

  test("фокус уходит внутрь и возвращается на прежний элемент", () => {
    const opener = mount(button("Открыть"));
    const confirm = button("Ок");
    const { element } = setup({}, div("Текст"), div({ attrs: { slot: "footer" } }, confirm));

    opener.focus();
    element.show();
    expect(document.activeElement).toBe(confirm);

    press(native(element), "Escape");
    expect(document.activeElement).toBe(opener);
  });

  test("modal=false открывает немодально", () => {
    const { element } = setup({ ".modal": false });
    element.show();
    expect(native(element).open).toBe(true);
    expect(native(element).hasAttribute("aria-modal")).toBe(false);
    // Подложки у немодального окна нет — клик по самому <dialog> его не закрывает.
    click(native(element));
    expect(element.open).toBe(true);
  });

  test("без showModal/show/close открывается атрибутом open", () => {
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    const saved = { showModal: proto.showModal, show: proto.show, close: proto.close };
    proto.showModal = undefined;
    proto.show = undefined;
    proto.close = undefined;
    try {
      const { element, log } = setup();
      element.show();
      expect(native(element).hasAttribute("open")).toBe(true);
      expect(shadow(element).activeElement).toBe(native(element));

      press(native(element), "Escape");
      expect(native(element).hasAttribute("open")).toBe(false);
      expect(log).toEqual(["open", "close:escape"]);
    } finally {
      Object.assign(proto, saved);
    }
  });
});
