import { describe, expect, test } from "bun:test";
import { span } from "@rwcjs/core";
import { click, mount, press, registerFresh, shadow } from "../test-utils";
import {
  registerAccordion,
  rwcAccordion,
  rwcAccordionItem,
  type Accordion,
  type AccordionItem,
  type AccordionToggleDetail,
} from "./accordion";

registerFresh(registerAccordion);

const trigger = (item: AccordionItem) => shadow(item).querySelector("button")!;
const region = (item: AccordionItem) => shadow(item).querySelector("[role=region]")!;
const itemsOf = (element: Accordion) => Array.from(element.children) as AccordionItem[];

const build = (config: Parameters<typeof rwcAccordion>[0] = {}) =>
  mount(
    rwcAccordion(
      config,
      rwcAccordionItem({ ".value": "a", ".heading": "Первый" }, "Ответ A"),
      rwcAccordionItem({ ".value": "b", ".heading": "Второй" }, "Ответ B"),
      rwcAccordionItem({ ".value": "c", ".heading": "Третий" }, "Ответ C"),
    ),
  );

describe("rwc-accordion", () => {
  test("заголовок-кнопка связан с областью через ARIA", () => {
    const [item] = itemsOf(build());
    const button = trigger(item!);

    expect(shadow(item!).querySelector("[role=heading]")!.getAttribute("aria-level")).toBe("3");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe(region(item!).id);
    expect(region(item!).getAttribute("aria-labelledby")).toBe(button.id);
    expect(button.textContent).toBe("Первый");
  });

  test("заголовок из слота heading", () => {
    const item = mount(rwcAccordionItem({}, span({ attrs: { slot: "heading" } }, "Из слота"), "Тело"));
    const headingSlot = shadow(item).querySelector<HTMLSlotElement>("slot[name=heading]")!;
    expect(headingSlot.assignedElements()[0]!.textContent).toBe("Из слота");
  });

  test("клик раскрывает пункт, отражает open и шлёт toggle", () => {
    const events: AccordionToggleDetail[] = [];
    const element = build({ "@toggle": (event) => events.push(event.detail) });
    const [first] = itemsOf(element);

    click(trigger(first!));
    expect(first!.open).toBe(true);
    expect(first!.hasAttribute("open")).toBe(true);
    expect(trigger(first!).getAttribute("aria-expanded")).toBe("true");
    expect(events).toEqual([{ value: "a", open: true }]);

    click(trigger(first!));
    expect(first!.hasAttribute("open")).toBe(false);
    expect(events).toEqual([
      { value: "a", open: true },
      { value: "a", open: false },
    ]);
  });

  test("без multiple раскрытие сворачивает соседей", () => {
    const events: AccordionToggleDetail[] = [];
    const element = build({ "@toggle": (event) => events.push(event.detail) });
    const [first, second] = itemsOf(element);

    click(trigger(first!));
    click(trigger(second!));
    expect(first!.open).toBe(false);
    expect(second!.open).toBe(true);
    expect(events).toEqual([
      { value: "a", open: true },
      { value: "b", open: true },
      { value: "a", open: false },
    ]);
  });

  test("multiple держит раскрытыми несколько пунктов", () => {
    const element = build({ ".multiple": true });
    expect(element.hasAttribute("multiple")).toBe(true);
    const [first, second] = itemsOf(element);

    click(trigger(first!));
    click(trigger(second!));
    expect(first!.open).toBe(true);
    expect(second!.open).toBe(true);
  });

  test("отключённый пункт не переключается", () => {
    const element = mount(rwcAccordion({}, rwcAccordionItem({ ".heading": "X", ".disabled": true }, "Y")));
    const [item] = itemsOf(element);
    expect(trigger(item!).getAttribute("aria-disabled")).toBe("true");

    click(trigger(item!));
    expect(item!.open).toBe(false);
  });

  test("стрелки и Home/End переводят фокус между заголовками", () => {
    const element = build();
    const [first, second, third] = itemsOf(element);

    press(trigger(first!), "ArrowDown");
    expect(shadow(second!).activeElement).toBe(trigger(second!));
    press(trigger(second!), "End");
    expect(shadow(third!).activeElement).toBe(trigger(third!));
    press(trigger(third!), "ArrowDown");
    expect(shadow(first!).activeElement).toBe(trigger(first!));
    press(trigger(first!), "ArrowUp");
    expect(shadow(third!).activeElement).toBe(trigger(third!));
    press(trigger(third!), "Home");
    expect(shadow(first!).activeElement).toBe(trigger(first!));
  });

  test("toggle вложенного аккордеона не путается с внешним", () => {
    const outer: AccordionToggleDetail[] = [];
    const inner = rwcAccordion({}, rwcAccordionItem({ ".value": "inner", ".heading": "Вложенный" }, "..."));
    const element = mount(
      rwcAccordion(
        { "@toggle": (event) => event.target === element && outer.push(event.detail) },
        rwcAccordionItem({ ".value": "outer", ".heading": "Внешний", ".open": true }, inner),
      ),
    );

    click(trigger(itemsOf(inner)[0]!));
    // Внешний пункт остался открыт, а внешний аккордеон ничего не сообщил.
    expect(itemsOf(element)[0]!.open).toBe(true);
    expect(outer).toEqual([]);
  });
});
