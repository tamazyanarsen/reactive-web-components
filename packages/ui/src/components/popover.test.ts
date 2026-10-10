import { describe, expect, test } from "bun:test";
import { button, div, input, type CustomElementOptions } from "@rwcjs/core";
import { click, mount, press, registerFresh, shadow, tick } from "../test-utils";
import { supportsTopLayer } from "../overlay";
import { registerPopover, rwcPopover, type Popover } from "./popover";

registerFresh(registerPopover);

const panel = (element: Popover) => shadow(element).querySelector<HTMLElement>(".panel")!;

const setup = (config: CustomElementOptions<Popover> = {}) => {
  const log: string[] = [];
  const trigger = button({ attrs: { slot: "trigger" } }, "Фильтры");
  const field = input({ attrs: { "aria-label": "Поиск" } });
  const element = mount(
    rwcPopover(
      {
        "@open": () => log.push("open"),
        "@close": (event) => log.push(`close:${event.detail}`),
        ...config,
      },
      trigger,
      div(field),
    ),
  );
  return { element, trigger, field, log };
};

describe("rwc-popover", () => {
  test("в happy-dom нет Popover API — работает запасной режим без атрибута popover", () => {
    expect(supportsTopLayer()).toBe(false);
    const { element } = setup();
    expect(panel(element).hasAttribute("popover")).toBe(false);
    expect(panel(element).getAttribute("role")).toBe("dialog");
    expect(element.getAttribute("placement")).toBe("bottom");
  });

  test("триггер получает aria-haspopup и aria-expanded", () => {
    const { element, trigger } = setup();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    element.open = true;
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("клик по триггеру открывает и закрывает, фокус переходит внутрь и возвращается", () => {
    const { element, trigger, field, log } = setup();
    trigger.focus();

    click(trigger);
    expect(element.open).toBe(true);
    expect(element.hasAttribute("open")).toBe(true);
    expect(document.activeElement).toBe(field);

    click(trigger);
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(log).toEqual(["open", "close:trigger"]);
  });

  test("клик по содержимому панели её не закрывает", () => {
    const { element, trigger, field } = setup();
    click(trigger);
    click(field);
    expect(element.open).toBe(true);
  });

  test("Escape закрывает и возвращает фокус на триггер", () => {
    const { element, trigger, field, log } = setup();
    click(trigger);
    press(field, "Escape");
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(log.at(-1)).toBe("close:escape");
  });

  test("нажатие снаружи закрывает без возврата фокуса", () => {
    const outside = mount(button("Снаружи"));
    const { element, trigger, log } = setup();
    click(trigger);
    outside.focus();
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(outside);
    expect(log.at(-1)).toBe("close:outside");
  });

  test("закрытая панель не слушает документ", () => {
    const { log } = setup();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(log).toEqual([]);
  });

  test("без фокусируемого содержимого фокус получает сама панель", () => {
    const trigger = button({ attrs: { slot: "trigger" } }, "Инфо");
    const element = mount(rwcPopover({}, trigger, div("Просто текст")));
    click(trigger);
    expect(shadow(element).activeElement).toBe(panel(element));
  });

  test("открытие через пропс и hide() — причина api", async () => {
    const { element, log } = setup({ ".open": true, ".label": "Фильтры" });
    await tick();
    expect(element.hasAttribute("open")).toBe(true);
    expect(panel(element).getAttribute("aria-label")).toBe("Фильтры");
    element.hide();
    expect(log).toEqual(["open", "close:api"]);
  });

  test("placement и align отражаются в атрибуты для CSS", () => {
    const { element } = setup({ ".placement": "top", ".align": "end" });
    expect(element.getAttribute("placement")).toBe("top");
    expect(element.getAttribute("align")).toBe("end");
  });
});
