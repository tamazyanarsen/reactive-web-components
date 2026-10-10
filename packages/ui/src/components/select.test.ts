import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { internalsOf, mount, registerFresh, shadow } from "../test-utils";
import { registerSelect, rwcSelect, type Select, type SelectOption } from "./select";

registerFresh(registerSelect);

const inner = (element: Select) => shadow(element).querySelector("select")!;

const LANGS: SelectOption[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch", disabled: true },
];

/** Имитирует выбор пользователя в нативном списке. */
const choose = (element: Select, value: string) => {
  inner(element).value = value;
  inner(element).dispatchEvent(new Event("change", { bubbles: true }));
};

describe("rwc-select", () => {
  test("рендерит варианты в нативный select и выбирает value", () => {
    const element = mount(rwcSelect({ ".options": LANGS, ".value": "en" }));
    const options = [...inner(element).options];
    expect(options.map((item) => item.value)).toEqual(["ru", "en", "de"]);
    expect(options.map((item) => item.textContent)).toEqual(["Русский", "English", "Deutsch"]);
    expect(options[2]!.disabled).toBe(true);
    expect(inner(element).value).toBe("en");
  });

  test("placeholder — скрытый пустой вариант, пока ничего не выбрано", () => {
    const element = mount(rwcSelect({ ".options": LANGS, ".placeholder": "Язык" }));
    const first = inner(element).options[0]!;
    expect(first.value).toBe("");
    expect(first.textContent).toBe("Язык");
    expect(first.disabled).toBe(true);
    expect(inner(element).value).toBe("");
    expect(inner(element).classList.contains("empty")).toBe(true);
  });

  test("выбор пользователя меняет value и шлёт change", () => {
    const changes: string[] = [];
    const element = mount(rwcSelect({ ".options": LANGS, "@change": (event) => changes.push(event.detail) }));
    choose(element, "en");
    expect(element.value).toBe("en");
    expect(changes).toEqual(["en"]);
    expect(internalsOf.get(element)!.value).toBe("en");
  });

  test("value снаружи и смена вариантов сохраняют выбор", () => {
    const element = mount(rwcSelect({ ".options": LANGS, ".value": "ru" }));
    element.value = "en";
    expect(inner(element).value).toBe("en");

    element.options = [...LANGS, { value: "fr", label: "Français" }];
    expect(inner(element).options.length).toBe(4);
    expect(inner(element).value).toBe("en");
  });

  test("варианты из атрибута в JSON", () => {
    const element = mount(rwcSelect());
    element.setAttribute("options", JSON.stringify(LANGS));
    expect(inner(element).options.length).toBe(3);
  });

  test("required без выбора — valueMissing, пустое значение не уходит в форму", () => {
    const element = mount(rwcSelect({ ".options": LANGS, ".required": true, ".placeholder": "Язык" }));
    const internals = internalsOf.get(element)!;
    expect(internals.value).toBeNull();
    expect(internals.validity.flags.valueMissing).toBe(true);
    expect(element.hasAttribute("required")).toBe(true);
    choose(element, "ru");
    expect(internals.validity.valid).toBe(true);
  });

  test("disabled отключает список и убирает значение из формы", () => {
    const element = mount(rwcSelect({ ".options": LANGS, ".value": "ru", ".disabled": true }));
    expect(inner(element).disabled).toBe(true);
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(internalsOf.get(element)!.value).toBeNull();
  });

  test("invalid — aria-invalid на списке", () => {
    const element = mount(rwcSelect({ ".invalid": true }));
    expect(inner(element).getAttribute("aria-invalid")).toBe("true");
    expect(element.hasAttribute("invalid")).toBe(true);
  });

  test("сброс формы возвращает начальный выбор и не трогает варианты", () => {
    const host = mount(form());
    const element = rwcSelect({ ".options": LANGS, ".value": "ru" });
    host.append(element);
    choose(element, "en");
    element.formResetCallback();
    expect(element.value).toBe("ru");
    expect(inner(element).value).toBe("ru");
    expect(element.options).toBe(LANGS);
  });
});
