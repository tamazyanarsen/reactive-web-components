import { describe, expect, test } from "bun:test";
import { button } from "@rwcjs/core";
import { click, mount, press, registerFresh, shadow } from "../test-utils";
import { registerDropdownMenu, rwcDropdownMenu, type DropdownMenu, type MenuItem } from "./dropdown-menu";

registerFresh(registerDropdownMenu);

const items: MenuItem[] = [
  { value: "edit", label: "Изменить" },
  { value: "copy", label: "Копировать" },
  { value: "archive", label: "Архивировать", disabled: true },
  { separator: true },
  { value: "delete", label: "Удалить" },
];

const setup = () => {
  const selected: string[] = [];
  const trigger = button({ attrs: { slot: "trigger" } }, "Действия");
  const element = mount(
    rwcDropdownMenu({ ".items": items, ".label": "Действия", "@select": (event) => selected.push(event.detail) }, trigger),
  );
  return { element, trigger, selected };
};

const menu = (element: DropdownMenu) => shadow(element).querySelector<HTMLElement>("[role=menu]")!;
const menuItems = (element: DropdownMenu) => [...shadow(element).querySelectorAll<HTMLElement>("[role=menuitem]")];
const focused = (element: DropdownMenu) => shadow(element).activeElement?.textContent;

describe("rwc-dropdown-menu", () => {
  test("рендерит меню с ролями, разделителем и отключённым пунктом", () => {
    const { element } = setup();
    expect(menu(element).getAttribute("aria-label")).toBe("Действия");
    expect(menuItems(element).map((item) => item.textContent)).toEqual([
      "Изменить",
      "Копировать",
      "Архивировать",
      "Удалить",
    ]);
    expect(menuItems(element)[2]!.getAttribute("aria-disabled")).toBe("true");
    expect(shadow(element).querySelectorAll("[role=separator]").length).toBe(1);
  });

  test("триггер получает aria-haspopup=menu и aria-expanded", () => {
    const { element, trigger } = setup();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    click(trigger);
    expect(element.open).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("клик по триггеру открывает меню с фокусом на первом пункте", () => {
    const { element, trigger } = setup();
    click(trigger);
    expect(focused(element)).toBe("Изменить");
    click(trigger);
    expect(element.open).toBe(false);
  });

  test("ArrowUp на триггере открывает меню на последнем пункте, ArrowDown — на первом", () => {
    const { element, trigger } = setup();
    press(trigger, "ArrowUp");
    expect(element.open).toBe(true);
    expect(focused(element)).toBe("Удалить");

    element.hide();
    press(trigger, "ArrowDown");
    expect(focused(element)).toBe("Изменить");
  });

  test("стрелки ходят по кругу и пропускают отключённые, Home/End — в края", () => {
    const { element, trigger } = setup();
    click(trigger);
    const at = () => shadow(element).activeElement!;

    press(at(), "ArrowDown");
    expect(focused(element)).toBe("Копировать");
    press(at(), "ArrowDown");
    expect(focused(element)).toBe("Удалить");
    press(at(), "ArrowDown");
    expect(focused(element)).toBe("Изменить");
    press(at(), "ArrowUp");
    expect(focused(element)).toBe("Удалить");
    press(at(), "Home");
    expect(focused(element)).toBe("Изменить");
    press(at(), "End");
    expect(focused(element)).toBe("Удалить");
  });

  test("поиск по первой букве", () => {
    const { element, trigger } = setup();
    click(trigger);
    press(shadow(element).activeElement!, "у");
    expect(focused(element)).toBe("Удалить");
    press(shadow(element).activeElement!, "к");
    // «ук» не найдено — фокус остаётся на месте.
    expect(focused(element)).toBe("Удалить");
  });

  test("Enter выбирает пункт, закрывает меню и возвращает фокус на триггер", () => {
    const { element, trigger, selected } = setup();
    click(trigger);
    press(shadow(element).activeElement!, "ArrowDown");
    press(shadow(element).activeElement!, "Enter");
    expect(selected).toEqual(["copy"]);
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  test("Space и клик тоже выбирают, отключённый пункт — нет", () => {
    const { element, trigger, selected } = setup();
    click(trigger);
    press(shadow(element).activeElement!, " ");
    expect(selected).toEqual(["edit"]);

    click(trigger);
    click(menuItems(element)[2]!);
    expect(selected).toEqual(["edit"]);
    expect(element.open).toBe(true);

    click(menuItems(element)[3]!);
    expect(selected).toEqual(["edit", "delete"]);
    expect(element.open).toBe(false);
  });

  test("Escape закрывает и возвращает фокус на триггер", () => {
    const { element, trigger, selected } = setup();
    click(trigger);
    press(shadow(element).activeElement!, "Escape");
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(selected).toEqual([]);
  });

  test("нажатие снаружи закрывает без возврата фокуса", () => {
    const outside = mount(button("Снаружи"));
    const { element, trigger } = setup();
    click(trigger);
    outside.focus();
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  test("смена items перестраивает пункты", () => {
    const { element } = setup();
    element.items = [{ value: "one", label: "Один" }];
    expect(menuItems(element).map((item) => item.textContent)).toEqual(["Один"]);
  });
});
