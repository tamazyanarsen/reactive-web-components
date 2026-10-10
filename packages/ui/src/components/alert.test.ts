import { describe, expect, test } from "bun:test";
import { div } from "@rwcjs/core";
import { click, mount, registerFresh, shadow } from "../test-utils";
import { registerAlert, rwcAlert, type Alert } from "./alert";

registerFresh(registerAlert);

const box = (element: Alert) => shadow(element).querySelector(".alert")!;
const closeButton = (element: Alert) => shadow(element).querySelector<HTMLButtonElement>(".close");

describe("rwc-alert", () => {
  test("рендерит тело в слоте, заголовок из пропса, роль status у info", () => {
    const element = mount(rwcAlert({ ".heading": "Обновление" }, "Вышла новая версия"));
    expect(element.getAttribute("variant")).toBe("info");
    expect(element.textContent).toBe("Вышла новая версия");
    expect(box(element).getAttribute("role")).toBe("status");
    const heading = shadow(element).querySelector(".heading")!;
    expect(heading.classList.contains("filled")).toBe(true);
    expect(heading.textContent).toBe("Обновление");
  });

  test("warning и danger получают role=alert", () => {
    const element = mount(rwcAlert({ ".variant": "warning" }, "Осторожно"));
    expect(box(element).getAttribute("role")).toBe("alert");
    element.variant = "success";
    expect(box(element).getAttribute("role")).toBe("status");
    element.variant = "danger";
    expect(box(element).getAttribute("role")).toBe("alert");
    expect(element.getAttribute("variant")).toBe("danger");
  });

  test("без заголовка обёртка пустая, слот heading её заполняет", () => {
    const bare = mount(rwcAlert({}, "Текст"));
    expect(shadow(bare).querySelector(".heading")!.classList.contains("filled")).toBe(false);

    const slotted = mount(rwcAlert({}, div({ attrs: { slot: "heading" } }, "Из слота"), "Текст"));
    expect(shadow(slotted).querySelector(".heading")!.classList.contains("filled")).toBe(true);
    expect(shadow(slotted).querySelector('slot[name="heading"]')).not.toBeNull();
  });

  test("кнопка закрытия только с dismissible", () => {
    const element = mount(rwcAlert({}, "Текст"));
    expect(closeButton(element)).toBeNull();
    element.dismissible = true;
    expect(closeButton(element)!.getAttribute("aria-label")).toBe("Dismiss");
    expect(element.hasAttribute("dismissible")).toBe(true);
  });

  test("закрытие отправляет dismiss и прячет компонент", () => {
    let dismissed = 0;
    const element = mount(rwcAlert({ ".dismissible": true, "@dismiss": () => dismissed++ }, "Текст"));
    click(closeButton(element)!);
    expect(dismissed).toBe(1);
    expect(element.hidden).toBe(true);
  });

  test("preventDefault() в dismiss оставляет сообщение на месте", () => {
    const element = mount(
      rwcAlert({ ".dismissible": true, "@dismiss": (event) => event.preventDefault() }, "Текст"),
    );
    click(closeButton(element)!);
    expect(element.hidden).toBe(false);
  });
});
