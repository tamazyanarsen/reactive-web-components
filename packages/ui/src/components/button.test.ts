import { describe, expect, test } from "bun:test";
import { form } from "@rwcjs/core";
import { click, mount, registerFresh, shadow } from "../test-utils";
import { registerButton, rwcButton, type Button } from "./button";

registerFresh(registerButton);

const inner = (element: Button) => shadow(element).querySelector("button")!;

describe("rwc-button", () => {
  test("рендерит слот и отражает вариант в атрибут", () => {
    const element = mount(rwcButton({ ".variant": "primary" }, "Сохранить"));
    expect(element.getAttribute("variant")).toBe("primary");
    expect(element.textContent).toBe("Сохранить");
    expect(shadow(element).querySelector("slot")).not.toBeNull();
  });

  test("press приходит на клик, а у отключённой кнопки — нет", () => {
    let presses = 0;
    const element = mount(rwcButton({ "@press": () => presses++ }, "Ок"));

    click(inner(element));
    expect(presses).toBe(1);

    element.disabled = true;
    click(inner(element));
    expect(presses).toBe(1);
    expect(inner(element).getAttribute("aria-disabled")).toBe("true");
  });

  test("loading показывает индикатор и блокирует нажатие", () => {
    let presses = 0;
    const element = mount(rwcButton({ ".loading": true, "@press": () => presses++ }, "Ок"));
    expect(shadow(element).querySelector(".spinner")).not.toBeNull();
    expect(inner(element).getAttribute("aria-busy")).toBe("true");

    click(inner(element));
    expect(presses).toBe(0);

    element.loading = false;
    expect(shadow(element).querySelector(".spinner")).toBeNull();
  });

  test("type=submit отправляет форму, в которой лежит", () => {
    let submits = 0;
    const host = mount(form({ "@submit": (event) => (event.preventDefault(), submits++) }));
    const element = rwcButton({ ".type": "submit" }, "Отправить");
    host.append(element);

    click(inner(element));
    expect(submits).toBe(1);
  });

  test("type=reset сбрасывает форму", () => {
    let resets = 0;
    const host = mount(form({ "@reset": () => resets++ }));
    const element = rwcButton({ ".type": "reset" }, "Сбросить");
    host.append(element);

    click(inner(element));
    expect(resets).toBe(1);
  });
});
