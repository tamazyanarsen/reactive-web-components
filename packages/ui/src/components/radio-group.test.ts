import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { click, internalsOf, mount, press, registerFresh, shadow, tick } from "../test-utils";
import { registerRadioGroup, rwcRadioGroup, type RadioGroup, type RadioOption } from "./radio-group";

registerFresh(registerRadioGroup);

const PLANS: RadioOption[] = [
  { value: "free", label: "Бесплатный" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Команда", disabled: true },
  { value: "ent", label: "Корпоративный" },
];

const group = (element: RadioGroup) => shadow(element).querySelector<HTMLElement>("[role=radiogroup]")!;
const radios = (element: RadioGroup) => [...shadow(element).querySelectorAll<HTMLElement>("[role=radio]")];
const radio = (element: RadioGroup, value: string) => radios(element).find((item) => item.dataset.value === value)!;
const checked = (element: RadioGroup) =>
  radios(element).filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.dataset.value);
const tabbable = (element: RadioGroup) =>
  radios(element).filter((item) => item.getAttribute("tabindex") === "0").map((item) => item.dataset.value);

describe("rwc-radio-group", () => {
  test("рендерит radiogroup с вариантами и отражает атрибуты", () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS, ".value": "pro", ".orientation": "horizontal" }));
    expect(radios(element).map((item) => item.textContent)).toEqual(["Бесплатный", "Pro", "Команда", "Корпоративный"]);
    expect(checked(element)).toEqual(["pro"]);
    expect(group(element).getAttribute("aria-orientation")).toBe("horizontal");
    expect(element.getAttribute("orientation")).toBe("horizontal");
    expect(radio(element, "team").getAttribute("aria-disabled")).toBe("true");
  });

  test("подпись из слота связывается с группой через aria-labelledby", async () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS }, "Тариф"));
    await tick();
    const label = shadow(element).querySelector(".label")!;
    expect(label.querySelector("slot")).not.toBeNull();
    expect(group(element).getAttribute("aria-labelledby")).toBe(label.id);
  });

  test("roving tabindex: в порядке Tab только выбранный, без выбора — первый доступный", () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS }));
    expect(tabbable(element)).toEqual(["free"]);
    expect(radio(element, "pro").getAttribute("tabindex")).toBe("-1");
    expect(radio(element, "team").hasAttribute("tabindex")).toBe(false);

    element.value = "ent";
    expect(tabbable(element)).toEqual(["ent"]);
  });

  test("клик выбирает вариант и шлёт change; повторный клик и отключённый вариант — нет", () => {
    const changes: string[] = [];
    const element = mount(rwcRadioGroup({ ".options": PLANS, "@change": (event) => changes.push(event.detail) }));

    click(radio(element, "pro"));
    expect(element.value).toBe("pro");
    expect(checked(element)).toEqual(["pro"]);

    click(radio(element, "pro"));
    click(radio(element, "team"));
    expect(element.value).toBe("pro");
    expect(changes).toEqual(["pro"]);
  });

  test("стрелки выбирают соседний доступный вариант по кругу и переводят фокус", () => {
    const changes: string[] = [];
    const element = mount(
      rwcRadioGroup({ ".options": PLANS, ".value": "pro", "@change": (event) => changes.push(event.detail) }),
    );

    // team отключён — стрелка его перескакивает.
    expect(press(radio(element, "pro"), "ArrowDown")).toBe(false);
    expect(element.value).toBe("ent");
    expect(shadow(element).activeElement).toBe(radio(element, "ent"));

    press(radio(element, "ent"), "ArrowRight");
    expect(element.value).toBe("free");

    press(radio(element, "free"), "ArrowUp");
    expect(element.value).toBe("ent");

    press(radio(element, "ent"), "ArrowLeft");
    expect(element.value).toBe("pro");
    expect(changes).toEqual(["ent", "free", "ent", "pro"]);
  });

  test("Space выбирает вариант под фокусом", () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS }));
    expect(press(radio(element, "free"), " ")).toBe(false);
    expect(element.value).toBe("free");
  });

  test("значение уходит в форму; required без выбора — valueMissing", () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS, ".required": true }));
    const internals = internalsOf.get(element)!;
    expect(internals.value).toBeNull();
    expect(internals.validity.flags.valueMissing).toBe(true);
    expect(group(element).getAttribute("aria-required")).toBe("true");

    click(radio(element, "free"));
    expect(internals.value).toBe("free");
    expect(internals.validity.valid).toBe(true);
  });

  test("disabled блокирует выбор и клавиатуру, убирает варианты из Tab и значение из формы", () => {
    let changes = 0;
    const element = mount(
      rwcRadioGroup({ ".options": PLANS, ".value": "pro", ".disabled": true, "@change": () => changes++ }),
    );
    click(radio(element, "free"));
    press(radio(element, "pro"), "ArrowDown");
    expect(element.value).toBe("pro");
    expect(changes).toBe(0);
    expect(tabbable(element)).toEqual([]);
    expect(group(element).getAttribute("aria-disabled")).toBe("true");
    expect(element.hasAttribute("disabled")).toBe(true);
    expect(internalsOf.get(element)!.value).toBeNull();
  });

  test("смена вариантов сохраняет выбор", () => {
    const element = mount(rwcRadioGroup({ ".options": PLANS, ".value": "pro" }));
    element.options = [{ value: "pro", label: "Pro+" }, ...PLANS.filter((item) => item.value !== "pro")];
    expect(radios(element)[0]!.textContent).toBe("Pro+");
    expect(checked(element)).toEqual(["pro"]);
  });

  test("сброс формы возвращает начальный выбор", () => {
    const host = mount(form());
    const element = rwcRadioGroup({ ".options": PLANS, ".value": "free" });
    host.append(element);
    click(radio(element, "ent"));
    element.formResetCallback();
    expect(element.value).toBe("free");
    expect(checked(element)).toEqual(["free"]);
  });
});
