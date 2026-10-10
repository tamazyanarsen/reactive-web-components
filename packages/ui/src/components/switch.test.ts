import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { click, internalsOf, mount, press, registerFresh, shadow } from "../test-utils";
import { registerSwitch, rwcSwitch, type Switch } from "./switch";

registerFresh(registerSwitch);

const root = (element: Switch) => shadow(element).querySelector<HTMLElement>("[role=switch]")!;

describe("rwc-switch", () => {
  test("рендерит role=switch с дорожкой и подписью из слота", () => {
    const element = mount(rwcSwitch("Уведомления"));
    expect(root(element).getAttribute("aria-checked")).toBe("false");
    expect(root(element).getAttribute("tabindex")).toBe("0");
    expect(shadow(element).querySelector(".track")!.getAttribute("aria-hidden")).toBe("true");
    expect(root(element).querySelector("slot")).not.toBeNull();
  });

  test("клик переключает, отражает checked и шлёт change", () => {
    const changes: boolean[] = [];
    const element = mount(rwcSwitch({ "@change": (event) => changes.push(event.detail) }));

    click(root(element));
    expect(element.checked).toBe(true);
    expect(element.hasAttribute("checked")).toBe(true);
    expect(root(element).getAttribute("aria-checked")).toBe("true");

    click(element);
    expect(element.checked).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  test("Space и Enter переключают", () => {
    const element = mount(rwcSwitch());
    expect(press(root(element), " ")).toBe(false);
    expect(element.checked).toBe(true);
    press(root(element), "Enter");
    expect(element.checked).toBe(false);
    press(root(element), "a");
    expect(element.checked).toBe(false);
  });

  test("значение формы и required", () => {
    const element = mount(rwcSwitch({ ".value": "1", ".required": true }));
    const internals = internalsOf.get(element)!;
    expect(internals.value).toBeNull();
    expect(internals.validity.flags.valueMissing).toBe(true);

    click(element);
    expect(internals.value).toBe("1");
    expect(internals.validity.valid).toBe(true);
  });

  test("disabled не переключается и не отдаёт значение", () => {
    let changes = 0;
    const element = mount(rwcSwitch({ ".disabled": true, ".checked": true, "@change": () => changes++ }));
    click(element);
    press(root(element), " ");
    expect(element.checked).toBe(true);
    expect(changes).toBe(0);
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(root(element).getAttribute("aria-disabled")).toBe("true");
    expect(root(element).hasAttribute("tabindex")).toBe(false);
    expect(internalsOf.get(element)!.value).toBeNull();
  });

  test("сброс формы возвращает начальное состояние", () => {
    const host = mount(form());
    const element = rwcSwitch();
    host.append(element);
    click(element);
    element.formResetCallback();
    expect(element.checked).toBe(false);
    expect(internalsOf.get(element)!.value).toBeNull();
  });
});
