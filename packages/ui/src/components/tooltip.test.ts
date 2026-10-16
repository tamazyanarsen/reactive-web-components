import { describe, expect, test } from "bun:test";
import { button, span, type CustomElementOptions } from "@rwcjs/core";
import { mount, press, registerFresh, shadow, tick } from "../test-utils";
import { registerTooltip, rwcTooltip, type Tooltip } from "./tooltip";

registerFresh(registerTooltip);

const bubble = (element: Tooltip) => shadow(element).querySelector<HTMLElement>("[role=tooltip]")!;

const setup = (config: CustomElementOptions<Tooltip> = { ".content": "Копировать" }) => {
  const trigger = button("⧉");
  const element = mount(rwcTooltip({ ".delay": 0, ...config }, trigger));
  return { element, trigger };
};

describe("rwc-tooltip", () => {
  test("текст из пропса в пузыре role=tooltip и в aria-description триггера", () => {
    const { element, trigger } = setup();
    expect(bubble(element).textContent).toBe("Копировать");
    expect(trigger.getAttribute("aria-description")).toBe("Копировать");
    expect(element.getAttribute("placement")).toBe("top");

    element.content = "Скопировано";
    expect(trigger.getAttribute("aria-description")).toBe("Скопировано");
  });

  test("текст из слота content связан с триггером через aria-describedby", () => {
    const content = span({ attrs: { slot: "content" } }, "Горячая клавиша ", "Ctrl+C");
    const trigger = button("⧉");
    const element = mount(rwcTooltip({}, trigger, content));
    // Префикс — тег с постфиксом: так id не совпадут у двух версий кита на странице.
    expect(content.id.startsWith(`${element.localName}-`)).toBe(true);
    expect(content.getAttribute("role")).toBe("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(content.id);
    expect(trigger.hasAttribute("aria-description")).toBe(false);
  });

  test("наведение показывает после задержки, уход мыши прячет", async () => {
    const { element } = setup({ ".content": "Копировать", ".delay": 20 });
    element.dispatchEvent(new MouseEvent("mouseenter"));
    expect(element.open).toBe(false);
    await tick(30);
    expect(element.open).toBe(true);
    expect(element.hasAttribute("open")).toBe(true);

    element.dispatchEvent(new MouseEvent("mouseleave"));
    expect(element.open).toBe(false);
  });

  test("уход мыши до конца задержки отменяет показ", async () => {
    const { element } = setup({ ".content": "Копировать", ".delay": 20 });
    element.dispatchEvent(new MouseEvent("mouseenter"));
    element.dispatchEvent(new MouseEvent("mouseleave"));
    await tick(30);
    expect(element.open).toBe(false);
  });

  test("фокус показывает сразу, потеря фокуса прячет", () => {
    const { element, trigger } = setup();
    const other = mount(button("Другая"));
    trigger.focus();
    expect(element.open).toBe(true);
    other.focus();
    expect(element.open).toBe(false);
  });

  test("Escape прячет подсказку, где бы ни был фокус", () => {
    const { element, trigger } = setup();
    trigger.focus();
    press(trigger, "Escape");
    expect(element.open).toBe(false);

    element.show();
    press(document.body, "Escape");
    expect(element.open).toBe(false);
  });

  test("отключение снимает связь с триггером", async () => {
    const { element, trigger } = setup();
    element.remove();
    await tick();
    expect(trigger.hasAttribute("aria-description")).toBe(false);
  });
});
