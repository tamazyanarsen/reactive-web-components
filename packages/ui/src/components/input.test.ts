import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { internalsOf, mount, registerFresh, shadow } from "../test-utils";
import { registerInput, rwcInput, type Input } from "./input";

registerFresh(registerInput);

const inner = (element: Input) => shadow(element).querySelector("input")!;

/** Имитирует ввод пользователя: меняет значение и шлёт input. */
const type = (element: Input, text: string) => {
  const field = inner(element);
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

describe("rwc-input", () => {
  test("рендерит нативный input с пропсами и отражает атрибуты", () => {
    const element = mount(
      rwcInput({ ".value": "привет", ".type": "email", ".placeholder": "Почта", ".required": true }),
    );
    const field = inner(element);
    expect(field.value).toBe("привет");
    expect(field.type).toBe("email");
    expect(field.getAttribute("placeholder")).toBe("Почта");
    expect(field.classList.contains("control")).toBe(true);
    expect(element.getAttribute("type")).toBe("email");
    expect(element.hasAttribute("required")).toBe(true);
  });

  test("ввод обновляет value и шлёт input с текстом; наружу не протекает нативный input", () => {
    const details: unknown[] = [];
    const element = mount(rwcInput({ "@input": (event) => details.push(event.detail) }));

    type(element, "abc");
    expect(element.value).toBe("abc");
    expect(details).toEqual(["abc"]);
  });

  test("change приходит при фиксации значения", () => {
    const changes: string[] = [];
    const element = mount(rwcInput({ "@change": (event) => changes.push(event.detail) }));
    type(element, "итог");
    inner(element).dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toEqual(["итог"]);
  });

  test("значение уходит в форму и следует за вводом", () => {
    const element = mount(rwcInput({ ".value": "a" }));
    expect(internalsOf.get(element)!.value).toBe("a");
    type(element, "ab");
    expect(internalsOf.get(element)!.value).toBe("ab");
    element.value = "снаружи";
    expect(inner(element).value).toBe("снаружи");
    expect(internalsOf.get(element)!.value).toBe("снаружи");
  });

  test("required без значения — valueMissing, со значением — валидно", () => {
    const element = mount(rwcInput({ ".required": true }));
    const internals = internalsOf.get(element)!;
    expect(internals.validity.valid).toBe(false);
    expect(internals.validity.flags.valueMissing).toBe(true);
    expect(internals.validity.message).not.toBe("");

    type(element, "x");
    expect(internals.validity.valid).toBe(true);
  });

  test("type=email проверяет формат", () => {
    const element = mount(rwcInput({ ".type": "email", ".value": "not-an-email" }));
    const internals = internalsOf.get(element)!;
    expect(internals.validity.flags.typeMismatch).toBe(true);

    type(element, "me@example.com");
    expect(internals.validity.valid).toBe(true);

    // Пустое необязательное поле валидно.
    type(element, "");
    expect(internals.validity.valid).toBe(true);
  });

  test("minlength и maxlength доходят до поля, короткое значение — tooShort", () => {
    const element = mount(rwcInput({ ".minlength": 3, ".maxlength": 10, ".value": "ab" }));
    expect(inner(element).getAttribute("minlength")).toBe("3");
    expect(inner(element).getAttribute("maxlength")).toBe("10");
    expect(internalsOf.get(element)!.validity.flags.tooShort).toBe(true);
    type(element, "abc");
    expect(internalsOf.get(element)!.validity.valid).toBe(true);
  });

  test("disabled отключает поле, убирает значение из формы и проверку", () => {
    const element = mount(rwcInput({ ".value": "x", ".required": true, ".disabled": true }));
    expect(inner(element).disabled).toBe(true);
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(internalsOf.get(element)!.value).toBeNull();

    element.value = "";
    expect(internalsOf.get(element)!.validity.valid).toBe(true);

    element.disabled = false;
    expect(internalsOf.get(element)!.validity.valid).toBe(false);
  });

  test("disabled у fieldset отключает поле", () => {
    const element = mount(rwcInput({ ".value": "x" }));
    element.formDisabledCallback(true);
    expect(inner(element).disabled).toBe(true);
    expect(internalsOf.get(element)!.value).toBeNull();
  });

  test("readonly и invalid", () => {
    const element = mount(rwcInput({ ".readonly": true, ".invalid": true }));
    expect(inner(element).readOnly).toBe(true);
    expect(inner(element).getAttribute("aria-invalid")).toBe("true");
    expect(element.hasAttribute("readonly")).toBe(true);
    expect(element.hasAttribute("invalid")).toBe(true);
  });

  test("сброс формы возвращает начальное значение и не трогает остальные пропсы", () => {
    const host = mount(form());
    const element = rwcInput({ ".value": "исходное", ".type": "email", ".placeholder": "p" });
    host.append(element);

    type(element, "другое");
    element.formResetCallback();
    expect(element.value).toBe("исходное");
    expect(inner(element).value).toBe("исходное");
    expect(element.type).toBe("email");
    expect(element.placeholder).toBe("p");
  });
});
