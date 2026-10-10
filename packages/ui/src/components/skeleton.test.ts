import { describe, expect, test } from "bun:test";
import { mount, registerFresh, shadow } from "../test-utils";
import { registerSkeleton, rwcSkeleton, type Skeleton } from "./skeleton";

registerFresh(registerSkeleton);

const blocks = (element: Skeleton) => [...shadow(element).querySelectorAll<HTMLElement>(".block")];

describe("rwc-skeleton", () => {
  test("по умолчанию одна строка текста, скрытая от читалок", () => {
    const element = mount(rwcSkeleton());
    expect(element.getAttribute("shape")).toBe("text");
    expect(blocks(element)).toHaveLength(1);
    expect(shadow(element).querySelector(".skeleton")!.getAttribute("aria-hidden")).toBe("true");
  });

  test("lines рендерит столько строк и реагирует на изменение", () => {
    const element = mount(rwcSkeleton({ ".lines": 3 }));
    expect(blocks(element)).toHaveLength(3);
    expect(blocks(element).every((block) => block.classList.contains("line"))).toBe(true);

    element.setAttribute("lines", "2");
    expect(blocks(element)).toHaveLength(2);
  });

  test("у прямоугольника и круга блок один, независимо от lines", () => {
    const element = mount(rwcSkeleton({ ".shape": "rect", ".lines": 4 }));
    expect(blocks(element)).toHaveLength(1);
    element.shape = "circle";
    expect(blocks(element)).toHaveLength(1);
    expect(element.getAttribute("shape")).toBe("circle");
  });

  test("width и height применяются как CSS-длины; у круга одна сторона задаёт обе", () => {
    const text = mount(rwcSkeleton({ ".width": "12rem", ".height": "20px" }));
    expect((shadow(text).querySelector(".skeleton") as HTMLElement).style.width).toBe("12rem");
    expect(blocks(text)[0]!.style.height).toBe("20px");

    const circle = mount(rwcSkeleton({ ".shape": "circle", ".width": "48px" }));
    expect(blocks(circle)[0]!.style.width).toBe("48px");
    expect(blocks(circle)[0]!.style.height).toBe("48px");
  });
});
