import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerSpinner, rwcSpinner } from "./spinner";

registerFresh(registerSpinner);

describe("rwc-spinner", () => {
  test("role=status с подписью по умолчанию, кольцо скрыто от читалок", () => {
    const element = mount(rwcSpinner());
    const status = shadow(element).querySelector('[role="status"]')!;
    expect(status.getAttribute("aria-label")).toBe("Loading");
    expect(shadow(element).querySelector(".ring")!.getAttribute("aria-hidden")).toBe("true");
  });

  test("подпись и размер меняются реактивно", () => {
    const element = mount(rwcSpinner({ ".size": "lg", ".label": "Сохраняем" }));
    expect(element.getAttribute("size")).toBe("lg");
    expect(shadow(element).querySelector('[role="status"]')!.getAttribute("aria-label")).toBe("Сохраняем");

    element.label = "Готово почти";
    element.size = "sm";
    expect(shadow(element).querySelector('[role="status"]')!.getAttribute("aria-label")).toBe("Готово почти");
    expect(element.getAttribute("size")).toBe("sm");
  });
});
