import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { click, internalsOf, mount, press, registerFresh, shadow } from "../test-utils";
import { registerCheckbox, rwcCheckbox, type Checkbox } from "./checkbox";

registerFresh(registerCheckbox);

const root = (element: Checkbox) => shadow(element).querySelector<HTMLElement>("[role=checkbox]")!;

describe("rwc-checkbox", () => {
  test("рендерит role=checkbox с подписью из слота", () => {
    const element = mount(rwcCheckbox("Принимаю условия"));
    expect(root(element).getAttribute("aria-checked")).toBe("false");
    expect(root(element).getAttribute("tabindex")).toBe("0");
    expect(root(element).querySelector("slot")).not.toBeNull();
    expect(element.textContent).toBe("Принимаю условия");
  });

  test("клик переключает, отражает checked и шлёт change с новым значением", () => {
    const changes: boolean[] = [];
    const element = mount(rwcCheckbox({ "@change": (event) => changes.push(event.detail) }, "Да"));

    click(root(element));
    expect(element.checked).toBe(true);
    expect(element.hasAttribute("checked")).toBe(true);
    expect(root(element).getAttribute("aria-checked")).toBe("true");

    // Клик по самому хосту — так приходит клик от внешнего <label for>.
    click(element);
    expect(element.checked).toBe(false);
    expect(element.hasAttribute("checked")).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  test("Space переключает, Enter — нет", () => {
    const element = mount(rwcCheckbox("Да"));
    press(root(element), "Enter");
    expect(element.checked).toBe(false);
    const notPrevented = press(root(element), " ");
    expect(notPrevented).toBe(false);
    expect(element.checked).toBe(true);
  });

  test("indeterminate — aria-checked=mixed, снимается переключением", () => {
    const element = mount(rwcCheckbox({ ".indeterminate": true }, "Все"));
    expect(root(element).getAttribute("aria-checked")).toBe("mixed");
    expect(element.hasAttribute("indeterminate")).toBe(true);

    click(root(element));
    expect(element.indeterminate).toBe(false);
    expect(element.checked).toBe(true);
    expect(root(element).getAttribute("aria-checked")).toBe("true");
  });

  test("значение формы: value у отмеченного, null у снятого", () => {
    const element = mount(rwcCheckbox({ ".value": "yes" }));
    const internals = internalsOf.get(element)!;
    expect(internals.value).toBeNull();
    click(element);
    expect(internals.value).toBe("yes");
  });

  test("required без отметки — valueMissing", () => {
    const element = mount(rwcCheckbox({ ".required": true }));
    const internals = internalsOf.get(element)!;
    expect(internals.validity.flags.valueMissing).toBe(true);
    expect(root(element).getAttribute("aria-required")).toBe("true");
    click(element);
    expect(internals.validity.valid).toBe(true);
  });

  test("disabled не переключается, не фокусируется и не отдаёт значение", () => {
    let changes = 0;
    const element = mount(rwcCheckbox({ ".disabled": true, ".checked": true, "@change": () => changes++ }));
    click(root(element));
    press(root(element), " ");
    expect(element.checked).toBe(true);
    expect(changes).toBe(0);
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(root(element).getAttribute("aria-disabled")).toBe("true");
    expect(root(element).hasAttribute("tabindex")).toBe(false);
    expect(internalsOf.get(element)!.value).toBeNull();
  });

  test("disabled у fieldset блокирует переключение", () => {
    const element = mount(rwcCheckbox());
    element.formDisabledCallback(true);
    click(element);
    expect(element.checked).toBe(false);
  });

  test("сброс формы возвращает начальную отметку", () => {
    const host = mount(form());
    const element = rwcCheckbox({ ".checked": true });
    host.append(element);
    click(element);
    expect(element.checked).toBe(false);
    element.formResetCallback();
    expect(element.checked).toBe(true);
    expect(internalsOf.get(element)!.value).toBe("on");
  });
});
