import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerAvatar, rwcAvatar, type Avatar } from "./avatar";

registerFresh(registerAvatar);

const image = (element: Avatar) => shadow(element).querySelector("img");
const initials = (element: Avatar) => shadow(element).querySelector<HTMLElement>(".initials");

describe("rwc-avatar", () => {
  test("с src показывает картинку с alt из name", () => {
    const element = mount(rwcAvatar({ ".src": "/ada.png", ".name": "Ада Лавлейс" }));
    expect(image(element)!.getAttribute("src")).toBe("/ada.png");
    expect(image(element)!.getAttribute("alt")).toBe("Ада Лавлейс");
    expect(initials(element)).toBeNull();
  });

  test("без src — инициалы с role=img и aria-label", () => {
    const element = mount(rwcAvatar({ ".name": "  ада   августа лавлейс " }));
    expect(image(element)).toBeNull();
    expect(initials(element)!.textContent).toBe("АЛ");
    expect(initials(element)!.getAttribute("role")).toBe("img");
    expect(initials(element)!.getAttribute("aria-label")).toBe("ада   августа лавлейс");
  });

  test("alt важнее name в подписи; одно слово — одна буква", () => {
    const element = mount(rwcAvatar({ ".name": "Ада", ".alt": "Профиль Ады" }));
    expect(initials(element)!.textContent).toBe("А");
    expect(initials(element)!.getAttribute("aria-label")).toBe("Профиль Ады");
  });

  test("ошибка загрузки переключает на инициалы, новый src пробует снова", () => {
    const element = mount(rwcAvatar({ ".src": "/broken.png", ".name": "Grace Hopper" }));
    image(element)!.dispatchEvent(new Event("error"));
    expect(image(element)).toBeNull();
    expect(initials(element)!.textContent).toBe("GH");

    element.src = "/grace.png";
    expect(image(element)!.getAttribute("src")).toBe("/grace.png");
  });

  test("без имени и картинки — пусто и скрыто от скринридера", () => {
    const element = mount(rwcAvatar());
    expect(initials(element)!.textContent).toBe("");
    expect(initials(element)!.getAttribute("aria-hidden")).toBe("true");
    expect(initials(element)!.hasAttribute("role")).toBe(false);
  });

  test("отражает размер и форму", () => {
    const element = mount(rwcAvatar({ ".size": "lg", ".shape": "square" }));
    expect(element.getAttribute("size")).toBe("lg");
    expect(element.getAttribute("shape")).toBe("square");
  });
});
