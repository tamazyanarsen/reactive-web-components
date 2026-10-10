import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerDivider, rwcDivider, type Divider } from "./divider";

registerFresh(registerDivider);

const label = (element: Divider) => shadow(element).querySelector<HTMLElement>("[part=label]")!;

describe("rwc-divider", () => {
  test("role=separator и горизонтальная ориентация по умолчанию", () => {
    const element = mount(rwcDivider());
    expect(element.getAttribute("role")).toBe("separator");
    expect(element.getAttribute("orientation")).toBe("horizontal");
    expect(element.getAttribute("aria-orientation")).toBe("horizontal");
  });

  test("вертикальный — aria-orientation=vertical", () => {
    const element = mount(rwcDivider({ ".orientation": "vertical" }));
    expect(element.getAttribute("aria-orientation")).toBe("vertical");

    element.orientation = "horizontal";
    expect(element.getAttribute("aria-orientation")).toBe("horizontal");
  });

  test("подпись показывается только когда есть", () => {
    const empty = mount(rwcDivider());
    expect(label(empty).hidden).toBe(true);
    expect(empty.hasAttribute("labelled")).toBe(false);

    const element = mount(rwcDivider("или"));
    expect(label(element).hidden).toBe(false);
    expect(element.hasAttribute("labelled")).toBe(true);
    expect(element.textContent).toBe("или");
  });

  test("пробельный текст подписью не считается", () => {
    const element = mount(rwcDivider("  \n "));
    expect(label(element).hidden).toBe(true);
  });

  test("линии декоративные", () => {
    const element = mount(rwcDivider());
    const lines = shadow(element).querySelectorAll(".line");
    expect(lines).toHaveLength(2);
    lines.forEach((line) => expect(line.getAttribute("aria-hidden")).toBe("true"));
  });
});
