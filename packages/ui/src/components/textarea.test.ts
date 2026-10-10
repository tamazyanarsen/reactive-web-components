import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { internalsOf, mount, registerFresh, shadow } from "../test-utils";
import { registerTextarea, rwcTextarea, type Textarea } from "./textarea";

registerFresh(registerTextarea);

const inner = (element: Textarea) => shadow(element).querySelector("textarea")!;

/** Имитирует ввод пользователя: меняет значение и шлёт input. */
const type = (element: Textarea, text: string) => {
  const field = inner(element);
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

describe("rwc-textarea", () => {
  test("рендерит нативный textarea с пропсами и отражает атрибуты", () => {
    const element = mount(rwcTextarea({ ".value": "строка", ".rows": 6, ".placeholder": "Комментарий", ".required": true }));
    const field = inner(element);
    expect(field.value).toBe("строка");
    expect(field.getAttribute("rows")).toBe("6");
    expect(field.getAttribute("placeholder")).toBe("Комментарий");
    expect(element.hasAttribute("required")).toBe(true);
  });

  test("ввод обновляет value, шлёт input; change — при фиксации", () => {
    const inputs: string[] = [];
    const changes: string[] = [];
    const element = mount(
      rwcTextarea({ "@input": (event) => inputs.push(event.detail), "@change": (event) => changes.push(event.detail) }),
    );

    type(element, "первая\nвторая");
    expect(element.value).toBe("первая\nвторая");
    expect(inputs).toEqual(["первая\nвторая"]);

    inner(element).dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toEqual(["первая\nвторая"]);
  });

  test("значение уходит в форму, required и minlength проверяются", () => {
    const element = mount(rwcTextarea({ ".required": true, ".minlength": 3 }));
    const internals = internalsOf.get(element)!;
    expect(internals.validity.flags.valueMissing).toBe(true);

    type(element, "ab");
    expect(internals.value).toBe("ab");
    expect(internals.validity.flags.tooShort).toBe(true);

    type(element, "abc");
    expect(internals.validity.valid).toBe(true);
  });

  test("disabled отключает поле и убирает значение из формы", () => {
    const element = mount(rwcTextarea({ ".value": "x", ".disabled": true }));
    expect(inner(element).disabled).toBe(true);
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(internalsOf.get(element)!.value).toBeNull();

    element.formDisabledCallback(false);
    element.disabled = false;
    expect(internalsOf.get(element)!.value).toBe("x");
  });

  test("readonly и invalid", () => {
    const element = mount(rwcTextarea({ ".readonly": true, ".invalid": true }));
    expect(inner(element).readOnly).toBe(true);
    expect(inner(element).getAttribute("aria-invalid")).toBe("true");
  });

  test("сброс формы возвращает начальное значение", () => {
    const host = mount(form());
    const element = rwcTextarea({ ".value": "исходное", ".rows": 8 });
    host.append(element);

    type(element, "другое");
    element.formResetCallback();
    expect(element.value).toBe("исходное");
    expect(element.rows).toBe(8);
  });
});
